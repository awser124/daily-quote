const nodemailer = require("nodemailer");

async function sendDailyMail() {
    try {
        // 获取一言数据
        const response = await fetch("https://v1.hitokoto.cn");
        const data = await response.json();
        
        const content = `“${data.hitokoto}” —— 《${data.from}》${data.from_who ? data.from_who : ""}`;

        // 配置 Outlook SMTP
        // 虽然你提供的是 IMAP 信息，但发送邮件必须使用 SMTP 协议
        const transporter = nodemailer.createTransport({
            host: "smtp.office365.com",
            port: 587,
            secure: false, // 587 端口对应 STARTTLS，此处必须为 false
            auth: {
                user: process.env.EMAIL_USER, // 你的 Outlook 邮箱
                pass: process.env.EMAIL_PASS, // 你的应用密码
            },
            tls: {
                ciphers: 'SSLv3' // 提高与 Office365 的兼容性
            }
        });

        const mailOptions = {
            from: `"每日一言" <${process.env.EMAIL_USER}>`,
            to: "target-user@example.com", // 接收者邮箱
            subject: "早安！今日名言已送到",
            html: `
                <div style="padding: 20px; border-left: 5px solid #0078d4; font-family: 'Microsoft YaHei', sans-serif;">
                    <p style="font-size: 18px; color: #333;">${data.hitokoto}</p>
                    <p style="text-align: right; color: #666;">—— 《${data.from}》 ${data.from_who || ""}</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log("邮件发送成功");
    } catch (error) {
        // 捕获异常并退出，确保 Actions 能显示失败状态
        console.error("执行失败原因:", error);
        process.exit(1);
    }
}

sendDailyMail();
