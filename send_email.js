const nodemailer = require("nodemailer");

async function getMorningData() {
    try {
        // 1. 获取名言
        const quoteRes = await fetch("https://v1.hitokoto.cn");
        const quoteData = await quoteRes.json();

        // 2. 获取天气 (切换回更兼容的 2.5 接口)
        // 北京坐标：lat=39.90, lon=116.40 (如果你母亲在其他城市，请修改此处)
        const lat = "39.90"; 
        const lon = "116.40";
        const apiKey = process.env.WEATHER_API_KEY;
        
        // 使用 2.5 weather 接口，这个不需要额外订阅
        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=zh_cn`;
        
        const weatherRes = await fetch(weatherUrl);
        const weatherData = await weatherRes.json();

        // 2.5 接口的判断标志是 cod === 200
        const hasData = weatherData && weatherData.cod === 200;

        if (!hasData) {
            console.error("天气接口返回错误:", weatherData.message);
        }

        return {
            quote: quoteData.hitokoto,
            from: quoteData.from,
            // 2.5 接口数据在 main 和 weather 数组中
            temp: hasData ? Math.round(weatherData.main.temp) : "N/A",
            desc: hasData ? weatherData.weather[0].description : "获取天气中",
            humidity: hasData ? weatherData.main.humidity : "--",
            date: new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric' })
        };
    } catch (error) {
        console.error("数据抓取流程异常:", error);
        return null;
    }
}

async function sendDailyMail() {
    const { EMAIL_USER, EMAIL_PASS, RECEIVER_EMAIL } = process.env;
    const data = await getMorningData();

    if (!data || !RECEIVER_EMAIL) {
        console.error("配置缺失或抓取失败");
        process.exit(1);
    }

    const recipients = RECEIVER_EMAIL.split(',').map(email => email.trim());
    const transporter = nodemailer.createTransport({
        service: "qq",
        port: 465,
        secure: true,
        auth: { user: EMAIL_USER, pass: EMAIL_PASS }
    });

    console.log(`正在群发给: ${recipients.join(', ')}`);

    for (const to of recipients) {
        try {
            const mailOptions = {
                from: `"每日早报" <${EMAIL_USER}>`,
                to: to,
                subject: `早安简报 | ${data.date}`,
                html: `
                    <div style="max-width: 500px; margin: 20px auto; border: 1px solid #eee; border-radius: 16px; font-family: 'Microsoft YaHei', sans-serif; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1); background-color: #fff;">
                        <div style="background: #0052d9; background: linear-gradient(135deg, #0052d9 0%, #0072ff 100%); color: #ffffff !important; padding: 35px 20px; text-align: center;">
                            <div style="font-size: 14px; opacity: 0.9; margin-bottom: 10px; color: #ffffff !important;">${data.date}</div>
                            <div style="font-size: 48px; font-weight: bold; margin-bottom: 10px; color: #ffffff !important;">${data.temp === 'N/A' ? data.temp : data.temp + '°C'}</div>
                            <div style="font-size: 20px; letter-spacing: 2px; color: #ffffff !important;">${data.desc}</div>
                        </div>
                        <div style="padding: 35px; background: #ffffff;">
                            <div style="font-size: 14px; color: #999; margin-bottom: 15px;">今日寄语：</div>
                            <div style="font-size: 18px; color: #333333 !important; line-height: 1.8;">
                                “${data.quote}”
                            </div>
                            <div style="text-align: right; color: #666666 !important; margin-top: 25px; font-style: italic;">
                                —— ${data.from}
                            </div>
                        </div>
                        <div style="background: #fcfcfc; padding: 15px; border-top: 1px solid #f0f0f0; text-align: center; font-size: 12px; color: #999999 !important;">
                            湿度：${data.humidity}% | 愿你和家人拥有愉快的一天
                        </div>
                    </div>
                `
            };
            await transporter.sendMail(mailOptions);
            console.log(`发送成功: ${to}`);
        } catch (err) {
            console.error(`发送给 ${to} 失败:`, err.message);
        }
    }
}

sendDailyMail();
