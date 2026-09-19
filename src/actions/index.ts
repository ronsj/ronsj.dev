import { ActionError, defineAction } from "astro:actions";
import { z } from "astro/zod";
import { env } from "cloudflare:workers";

export const server = {
  sendEmail: defineAction({
    accept: "form",
    input: z.object({
      // Empty form fields arrive as null, so the type error carries the same wording as the empty check.
      name: z
        .string("Please tell me your name.")
        .trim()
        .min(1, "Please tell me your name.")
        .max(200, "That name is too long."),
      email: z
        .email("Please enter a valid email address.")
        .trim()
        .max(320, "That email address is too long."),
      message: z
        .string("Please write a message.")
        .trim()
        .min(1, "Please write a message.")
        .max(5000, "Please keep your message under 5,000 characters."),
      // Honeypot: hidden from people, filled in by bots. Anything here means we quietly drop the mail.
      company: z.string().nullish(),
    }),
    handler: async ({ name, email, message, company }) => {
      if (company) return { ok: true };
      try {
        await env.EMAIL.send({
          from: { name: "ronsj.dev contact form", email: env.CONTACT_FROM },
          to: env.CONTACT_TO,
          replyTo: { name, email },
          subject: `Portfolio message from ${name}`,
          text: `From: ${name} <${email}>\n\n${message}`,
        });
      } catch (cause) {
        console.error("Contact form: email send failed", cause);
        throw new ActionError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Sorry, your message couldn't be sent right now. Please try again in a moment.",
        });
      }
      return { ok: true };
    },
  }),
};
