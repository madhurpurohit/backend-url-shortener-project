import z from "zod";

export const shortenerSchema = z.object({
  url: z
    .string({ required_error: "URL is required" })
    .trim()
    .url({ message: "Please enter a valid URL." })
    .max(2000, { message: "URL must be no more than 2000 characters." }),

  shortCode: z
    .string({ required_error: "Short code is required" })
    .trim()
    .min(3, { message: "Short code must be at least 3 characters long." })
    .max(30, { message: "Short code must be no more than 30 characters." }),
});

export const shortenerSearchParamsSchema = z.object({
  page: z.coerce
    .number()
    .int()
    .positive()
    .min(1)
    .optional()
    .default(1)
    .catch(1),
});
