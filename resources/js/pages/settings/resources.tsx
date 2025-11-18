import { Head, Link } from '@inertiajs/react';
import { Folder, BookOpen, ExternalLink } from 'lucide-react';
import { type BreadcrumbItem } from '@/types';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import HeadingSmall from '@/components/heading-small';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Resources',
        href: '/settings/resources',
    },
];

export default function Resources() {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Resources" />

            <SettingsLayout>
                <div className="space-y-6">
                    <HeadingSmall
                        title="Resources"
                        description="Access repository and documentation"
                    />

                    <div className="grid gap-4 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <Folder className="w-5 h-5 text-muted-foreground" />
                                    <CardTitle>Repository</CardTitle>
                                </div>
                                <CardDescription>
                                    View the source code and contribute to the project
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button asChild variant="outline" className="w-full">
                                    <a
                                        href="https://github.com/crg-philsca/fis-new"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        Open Repository
                                    </a>
                                </Button>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-2">
                                    <BookOpen className="w-5 h-5 text-muted-foreground" />
                                    <CardTitle>Documentation</CardTitle>
                                </div>
                                <CardDescription>
                                    Read the documentation and learn how to use the system
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button asChild variant="outline" className="w-full">
                                    <Link href="/docs" className="flex items-center gap-2">
                                        <BookOpen className="w-4 h-4" />
                                        Open Documentation
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}

