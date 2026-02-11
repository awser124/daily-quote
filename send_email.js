const nodemailer = require("nodemailer");

async function getMorningData() {
    try {
        // 1. 获取名言
        const quoteRes = await fetch("https://v1.hitokoto.cn");
        const quoteData = await quoteRes.json();

        // 2. 获取 OpenWeatherMap 天气数据
        // 替换下面的 lat 和 lon 为你所在城市的坐标
        const lat = "39.90"; 
        const lon = "116.40";
        const apiKey = "54c8b09e75c3d0d593d61a49aa1c08a7";
        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=zh_cn`;
        
        const weatherRes = await fetch(weatherUrl);
        const weatherData = await weatherRes.json();

        // 3. 格式化日期
        const today = new Date();
        const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`;

        return {
            quote: quoteData.hitokoto,
            from: quoteData.from,
            temp: Math.round(weatherData.main.temp),
            desc: weatherData.weather[0].description,
            humidity: weatherData.main.humidity,
            city: weatherData.name,
            date: dateStr
        };
    } catch (error) {
        console.error("获取数据失败:", error);
        return null;
    }
}

async function sendDailyMail() {
    const { EMAIL_USER, EMAIL_PASS, RECEIVER_EMAIL } = process.env;
    const data = await getMorningData();

    if (!data) {
        console.error("数据抓取不全，停止发送");
        process.exit(1);
    }

    try {
        const transporter = nodemailer.createTransport({
            service: "qq",
            port: 465,
            secure: true,
            auth: { user: EMAIL_USER, pass: EMAIL_PASS }
        });

        const mailOptions = {
            from: `"每日早报" <${EMAIL_USER}>`,
            to: RECEIVER_EMAIL,
            subject: `早安！${data.date} 简报已送达`,
            html: `
                <div style="max-width: 600px; margin: 20px auto; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; border: 1px solid #e0e0e0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                    <div style="background: linear-gradient(135deg, #0052d9 0%, #0072ff 100%); color: white; padding: 30px; text-align: center;">
                        <h2 style="margin: 0; font-size: 26px; letter-spacing: 2px;">MORNING BRIEF</h2>
                        <p style="margin: 10px 0 0; opacity: 0.9; font-size: 16px;">${data.date} | ${data.city}</p>
                    </div>
                    
                    <div style="padding: 30px; background: #ffffff;">
                        <div style="display: flex; align-items: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #f0f0f0;">
                            <div style="flex: 1;">
                                <span style="color: #888; font-size: 14px;">今日天气</span>
                                <div style="font-size: 28px; font-weight: bold; color: #0052d9; margin-top: 5px;">${data.temp}℃ / ${data.desc}</div>
                                <div style="font-size: 14px; color: #666; margin-top: 5px;">湿度：${data.humidity}%</div>
                            </div>
                        </div>

                        <div style="position: relative; padding: 25px; background: #f8f9fa; border-radius: 8px;">
                            <div style="font-size: 40px; color: #dee2e6; position: absolute; top: 10px; left: 15px; font-family: Georgia, serif;">“</div>
                            <p style="font-size: 18px; line-height: 1.7; color: #444; position: relative; z-index: 1; margin: 0; padding: 0 10px;">
                                ${data.quote}
                            </p>
                            <div style="text-align: right; margin-top: 15px; color: #666; font-size: 15px;">
                                —— ${data.from}
                            </div>
                        </div>

                        <div style="margin-top: 30px; text-align: center; color: #999; font-size: 12px;">
                            <p>这份简报是由 GitHub 机器人自动整理发送的</p>
                            <p>祝你今天心情愉快！</p>
                        </div>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log("早报已通过 OpenWeather 数据发送成功");
    } catch (error) {
        console.error("邮件发送流程失败:", error);
        process.exit(1);
    }
}

sendDailyMail();
