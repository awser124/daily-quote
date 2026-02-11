const nodemailer = require("nodemailer");

async function getMorningData() {
    try {
        const quoteRes = await fetch("https://v1.hitokoto.cn");
        const quoteData = await quoteRes.json();

        const lat = "39.90"; 
        const lon = "116.40";
        const apiKey = process.env.WEATHER_API_KEY;
        
        const weatherUrl = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=zh_cn`;
        
        const weatherRes = await fetch(weatherUrl);
        const weatherData = await weatherRes.json();

        const hasData = weatherData && weatherData.current;

        return {
            quote: quoteData.hitokoto,
            from: quoteData.from,
            temp: hasData ? Math.round(weatherData.current.temp) : "N/A",
            desc: hasData ? weatherData.current.weather[0].description : "数据同步中",
            humidity: hasData ? weatherData.current.humidity : "--",
            date: new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric' })
        };
    } catch (error) {
        console.error("数据抓取失败:", error);
        return null;
    }
}

async function sendDailyMail() {
    const { EMAIL_USER, EMAIL_PASS, RECEIVER_EMAIL } = process.env;
    const data = await getMorningData();

    if (!data || !RECEIVER_EMAIL) {
        console.error("缺少必要配置或数据");
        process.exit(1);
    }

    // 将逗号分隔的邮箱字符串转为数组，并去除空格
    const recipients = RECEIVER_EMAIL.split(',').map(email => email.trim());

    const transporter = nodemailer.createTransport({
        service: "qq",
        port: 465,
        secure: true,
        auth: { user: EMAIL_USER, pass: EMAIL_PASS }
    });

    console.log(`准备发送给 ${recipients.length} 个联系人...`);

    // 使用循环逐一发送，确保互不影响
    for (const to of recipients) {
        try {
            const mailOptions = {
                from: `"每日早报" <${EMAIL_USER}>`,
                to: to,
                subject: `早安简报 | ${data.date}`,
                html: `
                    <div style="max-width: 500px; margin: 20px auto; border: 1px solid #eee; border-radius: 16px; font-family: sans-serif; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
                        <div style="background: linear-gradient(135deg, #0052d9 0%, #0072ff 100%); color: white; padding: 35px 20px; text-align: center;">
                            <div style="font-size: 14px; opacity: 0.8; margin-bottom: 10px;">${data.date}</div>
                            <div style="font-size: 48px; font-weight: bold; margin-bottom: 10px;">${data.temp === 'N/A' ? data.temp : data.temp + '°C'}</div>
                            <div style="font-size: 20px; letter-spacing: 2px;">${data.desc}</div>
                        </div>
                        <div style="padding: 35px; background: #fff;">
                            <div style="font-size: 14px; color: #999; margin-bottom: 15px;">今日寄语：</div>
                            <div style="font-size: 19px; color: #333; line-height: 1.8;">“${data.quote}”</div>
                            <div style="text-align: right; color: #777; margin-top: 25px; font-style: italic;">—— ${data.from}</div>
                        </div>
                        <div style="background: #fcfcfc; padding: 15px; border-top: 1px solid #f0f0f0; text-align: center; font-size: 12px; color: #aaa;">
                            湿度：${data.humidity}% | 来源：OpenWeather 3.0
                        </div>
                    </div>
                `
            };

            await transporter.sendMail(mailOptions);
            console.log(`成功发送至: ${to}`);
        } catch (err) {
            console.error(`发送至 ${to} 失败:`, err.message);
        }
    }
}

sendDailyMail();
