import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Mail, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

function VerifyEmail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  // Get email from URL params if available
  const email = searchParams.get("email") || "";

  const handleResendEmail = async () => {
    setIsResending(true);
    setResendSuccess(false);

    try {
      // TODO: Replace with your actual API endpoint
      const response = await fetch(
        "http://localhost:3000/api/auth/resend-verification",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email }),
        }
      );

      if (response.ok) {
        setResendSuccess(true);
        toast.success("Verification email has been resent successfully!");
      } else {
        const data = await response.json();
        toast.error(data.message || "Failed to resend verification email");
      }
    } catch (error) {
      toast.error("An error occurred. Please try again later.");
      console.error("Resend email error:", error);
    } finally {
      setIsResending(false);
    }
  };

  const handleGoToLogin = () => {
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border shadow-lg">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10">
            <Mail className="size-8 text-primary" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-2xl font-semibold tracking-tight">
              Verify Your Email
            </CardTitle>
            <CardDescription className="text-balance text-base">
              {email ? (
                <>
                  Welcome{" "}
                  <span className="font-medium text-foreground">{email}</span>
                </>
              ) : (
                "Please verify your email address to continue"
              )}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <p className="text-center text-sm text-muted-foreground text-balance leading-relaxed">
            We&apos;ve sent a verification link to your email address. Please
            check your inbox and click the link to verify your account.
          </p>

          {resendSuccess && (
            <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-foreground">
              <CheckCircle2 className="size-4 text-primary" />
              <span>Verification email has been resent successfully!</span>
            </div>
          )}

          <div className="space-y-3">
            <Button
              onClick={handleResendEmail}
              disabled={isResending}
              className="w-full"
              size="lg"
            >
              {isResending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 size-4" />
                  Resend Email
                </>
              )}
            </Button>

            <Button
              onClick={handleGoToLogin}
              variant="outline"
              className="w-full bg-transparent"
              size="lg"
            >
              <ArrowLeft className="mr-2 size-4" />
              Go to Login
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Didn&apos;t receive the email? Check your spam folder or try
            resending.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
export default VerifyEmail;
