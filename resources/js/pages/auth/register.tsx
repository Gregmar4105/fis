import RegisteredUserController from '@/actions/App/Http/Controllers/Auth/RegisteredUserController';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { login, home } from '@/routes';
import { Form, Head, Link } from '@inertiajs/react';
import { LoaderCircle, Plane, ArrowLeft } from 'lucide-react';

export default function Register() {
    return (
        <>
            <Head title="Register" />
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-blue-950 dark:to-indigo-950 flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    {/* Logo and Back Link */}
                    <div className="mb-8 flex flex-col items-center">
                        <Link
                            href={home()}
                            className="flex flex-col items-center gap-2 mb-6 group"
                        >
                            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg group-hover:shadow-xl transition-all group-hover:scale-105">
                                <Plane className="w-7 h-7 text-white" />
                            </div>
                            <div className="text-center">
                                <div className="text-2xl font-bold text-slate-900 dark:text-white">FIS</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">Flight Information System</div>
                            </div>
                        </Link>
                    </div>

                    {/* Register Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                        <div className="p-8 sm:p-10">
                            <div className="mb-8">
                                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                                    Create an account
                                </h1>
                                <p className="text-slate-600 dark:text-slate-400">
                                    Enter your details below to create your account
                                </p>
                            </div>

                            <Form
                                {...RegisteredUserController.store.form()}
                                resetOnSuccess={['password', 'password_confirmation']}
                                disableWhileProcessing
                                className="flex flex-col gap-6"
                            >
                                {({ processing, errors }) => (
                                    <>
                                        <div className="grid gap-6">
                                            <div className="grid gap-2">
                                                <Label htmlFor="name" className="text-slate-700 dark:text-slate-300 font-medium">
                                                    Name
                                                </Label>
                                                <Input
                                                    id="name"
                                                    type="text"
                                                    required
                                                    autoFocus
                                                    tabIndex={1}
                                                    autoComplete="name"
                                                    name="name"
                                                    placeholder="Full name"
                                                    className="h-12 border-slate-300 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-blue-500 dark:focus:ring-blue-500"
                                                />
                                                <InputError
                                                    message={errors.name}
                                                    className="mt-2"
                                                />
                                            </div>

                                            <div className="grid gap-2">
                                                <Label htmlFor="email" className="text-slate-700 dark:text-slate-300 font-medium">
                                                    Email address
                                                </Label>
                                                <Input
                                                    id="email"
                                                    type="email"
                                                    required
                                                    tabIndex={2}
                                                    autoComplete="email"
                                                    name="email"
                                                    placeholder="email@example.com"
                                                    className="h-12 border-slate-300 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-blue-500 dark:focus:ring-blue-500"
                                                />
                                                <InputError message={errors.email} />
                                            </div>

                                            <div className="grid gap-2">
                                                <Label htmlFor="password" className="text-slate-700 dark:text-slate-300 font-medium">
                                                    Password
                                                </Label>
                                                <Input
                                                    id="password"
                                                    type="password"
                                                    required
                                                    tabIndex={3}
                                                    autoComplete="new-password"
                                                    name="password"
                                                    placeholder="Password"
                                                    className="h-12 border-slate-300 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-blue-500 dark:focus:ring-blue-500"
                                                />
                                                <InputError message={errors.password} />
                                            </div>

                                            <div className="grid gap-2">
                                                <Label htmlFor="password_confirmation" className="text-slate-700 dark:text-slate-300 font-medium">
                                                    Confirm password
                                                </Label>
                                                <Input
                                                    id="password_confirmation"
                                                    type="password"
                                                    required
                                                    tabIndex={4}
                                                    autoComplete="new-password"
                                                    name="password_confirmation"
                                                    placeholder="Confirm password"
                                                    className="h-12 border-slate-300 dark:border-slate-700 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-blue-500 dark:focus:ring-blue-500"
                                                />
                                                <InputError
                                                    message={errors.password_confirmation}
                                                />
                                            </div>

                                            <Button
                                                type="submit"
                                                className="mt-2 w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
                                                tabIndex={5}
                                                disabled={processing}
                                                data-test="register-user-button"
                                            >
                                                {processing ? (
                                                    <span className="inline-flex items-center gap-2">
                                                        <LoaderCircle className="h-5 w-5 animate-spin" />
                                                        Signing up...
                                                    </span>
                                                ) : (
                                                    'SIGN UP'
                                                )}
                                            </Button>
                                        </div>

                                        <div className="text-center pt-4 border-t border-slate-200 dark:border-slate-800">
                                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                                                Already have an account?
                                            </p>
                                            <Link
                                                href={login()}
                                                className="group inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 border-2 border-slate-200 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 transition-all shadow-md hover:shadow-lg w-full justify-center"
                                            >
                                                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                                                Log in
                                            </Link>
                                        </div>
                                    </>
                                )}
                            </Form>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-8 text-center">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            © 2025 AVIATORS. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}
