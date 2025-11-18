<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;

class RegisteredUserController extends Controller
{
    /**
     * Show the registration page.
     */
    public function create(): Response
    {
        return Inertia::render('auth/register');
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            // Use the actual table name for the unique rule so validation
            // behaves correctly in all environments.
            'email' => 'required|string|lowercase|email|max:255|unique:users',
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        $hashedPassword = Hash::make($request->password);
        $webhookUrl = env('N8N_REGISTER_URL');

        // If no webhook is configured, fall back to creating a local user
        // payload. This avoids runtime exceptions when the environment
        // doesn't provide an external registration endpoint.
        if (empty($webhookUrl)) {
            $data = [
                'id' => null,
                'name' => $request->name,
                'email' => $request->email,
                'password' => $hashedPassword,
            ];
        } else {
            try {
                $response = Http::post($webhookUrl, [
                    'name' => $request->name,
                    'email' => $request->email,
                    'password' => $hashedPassword,
                    'created_at' => now()->toDateTimeString(),
                    'updated_at' => now()->toDateTimeString(),
                ]);
            } catch (\Exception $e) {
                return back()->withErrors(['webhook' => 'Could not reach registration webhook.']);
            }

            if ($response->failed()) {
                return back()->withErrors(['webhook' => 'Webhook returned an error.']);
            }

            $data = $response->json();
        }

        // Persist (upsert) a local copy of the user so the authentication
        // guard can find them on subsequent requests. If a local user already
        // exists keep their local password (do not overwrite). This approach
        // keeps production behavior (webhook-driven) while ensuring a local
        // user record exists.
        $local = User::where('email', $data['email'] ?? $request->email)->first();

        if (! $local) {
            $localAttrs = [
                'name' => $data['name'] ?? $request->name,
                'email' => $data['email'] ?? $request->email,
                'password' => $data['password'] ?? $hashedPassword,
            ];

            $local = User::create($localAttrs);
        } else {
            // Only set password if local password is empty (avoid overwriting
            // local credentials which may be authoritative).
            if (empty($local->password) && ! empty($data['password'])) {
                $local->password = $data['password'];
                $local->save();
            }
        }

        event(new Registered($local));

        Auth::login($local);
        $request->session()->regenerate();

        return redirect()->route('verification.notice');
    }
}
