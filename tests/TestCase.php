<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Ensure the test container has an auth.password binding so Password
        // facade resolves to a working broker. Prefer the framework manager
        // implementation when available so password reset notifications work.
        if (!app()->bound('auth.password')) {
            // Provide a lightweight in-memory password broker for tests. It
            // generates tokens, sends the ResetPassword notification and
            // validates tokens for the reset flow. This avoids instantiating
            // the full manager which can introduce heavy dependencies in
            // this test environment.
            app()->singleton('auth.password', function () {
                return new class {
                    private array $tokens = [];

                    public function sendResetLink(array $credentials)
                    {
                        $user = \App\Models\User::where('email', $credentials['email'] ?? null)->first();

                        if (! $user) {
                            return \Illuminate\Auth\Passwords\PasswordBroker::INVALID_USER;
                        }

                        $token = bin2hex(random_bytes(16));
                        $this->tokens[$user->email] = $token;

                        $user->sendPasswordResetNotification($token);

                        return \Illuminate\Auth\Passwords\PasswordBroker::RESET_LINK_SENT;
                    }

                    public function reset(array $credentials, $callback)
                    {
                        $email = $credentials['email'] ?? null;
                        $token = $credentials['token'] ?? null;

                        $user = \App\Models\User::where('email', $email)->first();

                        if (! $user) {
                            return \Illuminate\Auth\Passwords\PasswordBroker::INVALID_USER;
                        }

                        if (! isset($this->tokens[$email]) || $this->tokens[$email] !== $token) {
                            return \Illuminate\Auth\Passwords\PasswordBroker::INVALID_TOKEN;
                        }

                        $callback($user, $credentials['password']);

                        unset($this->tokens[$email]);

                        return \Illuminate\Auth\Passwords\PasswordBroker::PASSWORD_RESET;
                    }
                };
            });
        }

        // Disable external n8n registration during tests
        config(['n8n.enabled' => false]);

        // Prevent external HTTP calls during tests (e.g. registration webhook).
        // Return a successful JSON payload for any outbound request so code
        // that expects a webhook response can proceed normally.
        \Illuminate\Support\Facades\Http::fake([
            '*' => \Illuminate\Support\Facades\Http::response([
                'id' => 9999,
                'name' => 'Test Generated',
                'email' => 'test@example.com',
                'password' => \Illuminate\Support\Facades\Hash::make('password'),
            ], 200),
        ]);

        // Lookup table seeding should be performed via normal migrations/seeders.
    }
}
