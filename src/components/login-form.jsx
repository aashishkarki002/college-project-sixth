import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useFormik } from "formik";
import api from "../../plugins/axios";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Spinner } from "@/components/ui/spinner";
export default function LoginForm({ className, ...props }) {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { fetchMe } = useAuth();
  const formik = useFormik({
    initialValues: {
      email: "",
      password: "",
    },
    onSubmit: async (values) => {
      setLoading(true);
      try {
        const response = await api.post("/api/auth/login", {
          email: values.email,
          password: values.password,
        });

        const data = response.data;

        if (data.success) {
          // Store token in localStorage
          localStorage.setItem("token", data.token);
          // Fetch user data to update AuthContext (force fetch even on login page)
          await fetchMe(true);
          // Navigate to home page
          navigate("/");
        } else {
          toast.error(data.message);
        }
      } catch (error) {
        console.error("Login error:", error);
        const errorMessage =
          error.response?.data?.message || "Login failed. Please try again.";
        toast.error(errorMessage);
      }
      setLoading(false);
    },
  });
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>Login to your account</CardTitle>
          <CardDescription>
            Enter your email below to login to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={formik.handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  formik={formik}
                  onChange={formik.handleChange}
                  value={formik.values.email}
                  name="email"
                />
              </Field>
              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <a
                    href="#"
                    className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                  >
                    Forgot your password?
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  formik={formik}
                  onChange={formik.handleChange}
                  value={formik.values.password}
                  name="password"
                />
              </Field>
              <Field>
                <Button type="submit">{loading ? <Spinner /> : "Login"}</Button>

                <FieldDescription className="text-center">
                  Don&apos;t have an account? <a href="/signup">Sign up</a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
