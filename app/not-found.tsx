import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-4xl font-bold">404</CardTitle>
          <CardDescription className="text-lg">
            Oops! This page seems to have wandered off.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>
            Maybe it&apos;s chasing butterflies, or perhaps it just needed a
            coffee break. We&apos;re not sure, but it&apos;s definitely not
            here.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button asChild>
            <Link href="/dashboard" prefetch={true}>
              Beam Me Back Home
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
