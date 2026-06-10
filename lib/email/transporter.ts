import nodemailer from "nodemailer";
import { MailtrapTransport } from "mailtrap";

const token = process.env.MAILTRAP_API_TOKEN;

if (!token) {
    console.warn("[email] MAILTRAP_API_TOKEN is not set. Emails will be mocked.");
}

export const transporter = token
    ? nodemailer.createTransport(
        MailtrapTransport({
            token,
        })
    )
    : null;
