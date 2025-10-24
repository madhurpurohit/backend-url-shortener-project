import { Resend } from "resend";
import "dotenv/config";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendMail = async ({ to, subject, html }) => {
  try {
    const { data, error } = await resend.emails.send({
      from: "Website <website@resend.dev>",
      to,
      subject,
      html,
    });

    if (error) {
      return console.log(error);
    } else {
      return console.log("Resend Email Data: ", data);
    }
  } catch (error) {
    console.log(error);
  }
};
