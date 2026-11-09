import { z } from "zod";

export const credentialsSchema = z.object({
  email: z.string().trim().email("Enter a valid email address.").max(254, "Use at most 254 characters for your email."),
  password: z.string().min(1, "Enter your password.").max(128, "Use at most 128 characters for your password."),
});

export const signUpSchema = credentialsSchema.extend({
  display_name: z.string().trim().min(1, "Enter your display name.").max(80, "Use at most 80 characters for your display name."),
  password: z.string().min(8, "Use at least 8 characters for your password.").max(128, "Use at most 128 characters for your password."),
  role: z.enum(["learner", "storyteller"], { error: "Choose Learner or Storyteller." }),
});

export const profileSchema = z.object({
  id: z.uuid(),
  display_name: z.string(),
  role: z.enum(["learner", "storyteller", "teacher"]),
});

export const roleLabels = {
  learner: "Learner",
  storyteller: "Storyteller",
  teacher: "Teacher",
} as const;
