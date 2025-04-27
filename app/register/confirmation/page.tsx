import Link from "next/link";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ConfirmationPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <Card>
          <CardHeader className="text-center">
            <h2 className="text-2xl font-bold">Check your email</h2>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-gray-600">
              We have sent you an email with a confirmation link. Please check
              your inbox and click the link to complete your registration.
            </p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Link href="/login" prefetch={true}>
              <Button variant="outline">Back to Login</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
