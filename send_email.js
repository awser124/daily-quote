const nodemailer = require("nodemailer");

async function sendDailyMail() {
    // 检查环境变量
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.error("环境变量未正确配置");
        process.exit(1);
    }

    try {
        // 获取一言名言数据
        const response = await fetch("https://v1.hitokoto.cn");
        const data = await response.json();
        
        const quoteContent = data.hitokoto;
        const quoteFrom = `—— 《${data.from}》 ${data.from_who || ""}`;

        // 配置 QQ 邮箱传输器
        const transporter = nodemailer.createTransport({
            service: "qq", // 使用 nodemailer 内置的 QQ 配置
            port: 465,
            secure: true, // QQ 邮箱 465 端口必须为 true
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            }
        });

        const mailOptions = {
            from: `"每日一言" <${process.env.EMAIL_USER}>`,
            to: process.env.RECEIVER_EMAIL || process.env.EMAIL_USER, 
            subject: "早安！今日名言已送到",
            html: `
                <div style="padding: 20px; background-color: #f6f8fa; font-family: sans-serif;">
                    <div style="background: white; border-radius: 8px; padding: 25px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
                        <p style="font-size: 20px; color: #24292e; line-height: 1.5; margin-bottom: 20px;">${quoteContent}</p>
                        <p style="text-align: right; color: #57606a; font-size: 16px;">${quoteFrom}</p>
                    </div>
                </div>
            `
        };

        console.log("正在通过 QQ 邮箱发送...");
        const result = await transporter.sendMail(mailOptions);
        console.log("邮件发送成功:", result.messageId);
    } catch (error) {
        console.error("发送过程中出现错误:");
        console.error(error);
        process.exit(1);
    }
}

sendDailyMail();
