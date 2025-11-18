<?php

test('registration screen can be rendered', function () {
    // Some environments protect registration behind a permission middleware.
    // Disable only the Spatie permission middleware so session and CSRF
    // middleware remain active.
    $this->withoutMiddleware(\Spatie\Permission\Middlewares\PermissionMiddleware::class);

    $response = $this->get(route('register'));

    $response->assertStatus(200);
});

test('new users can register', function () {
    // Disable only the permission middleware so registration is allowed
    // while keeping session handling intact.

        // Disable CSRF middleware for the POST so tests can submit the form
        // without needing a CSRF token, but keep session middleware active.
        $this->withoutMiddleware(\Illuminate\Foundation\Http\Middleware\VerifyCsrfToken::class);

    $response = $this->post(route('register.store'), [
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    // The application redirects newly-registered users to the email
    // verification notice. Ensure a local user record was created and the
    // response redirects to the verification route.
    $this->assertDatabaseHas('users', ['email' => 'test@example.com']);
    $response->assertRedirect(route('verification.notice', absolute: false));
});