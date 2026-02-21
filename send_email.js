const nodemailer = require("nodemailer");

async function getMorningData() {
    const targetCity = "襄阳";
    let weatherData = null;

    // 随机延迟 1-5 秒，防止 GitHub 任务瞬间并发冲击 API
    const waitTime = Math.floor(Math.random() * 4000) + 1000;
    await new Promise(resolve => setTimeout(resolve, waitTime));

    const userAgents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
    ];

    // 尝试获取天气数据，最多尝试 3 次，间隔递增
    for (let i = 0; i < 3; i++) {
        try {
            const res = await fetch(`https://uapis.cn/api/v1/misc/weather?city=${encodeURIComponent(targetCity)}`, {
                headers: {
                    "User-Agent": userAgents[Math.floor(Math.random() * userAgents.length)]
                }
            });
            if (!res.ok) {
                throw new Error(`天气接口状态异常: ${res.status}`);
            }

            const json = await res.json();
            if (json && json.code === 200) {
                weatherData = json;
                break;
            }
            console.log(`尝试 ${i + 1} 失败，API 返回: ${json.msg || '限流中'}`);
            // 失败后等待更久一点
            await new Promise(resolve => setTimeout(resolve, 5000 * (i + 1))); 
        } catch (e) {
            console.error(`请求异常: ${e.message}`);
        }
    }

    try {
        const quoteRes = await fetch("https://v1.hitokoto.cn");
        if (!quoteRes.ok) {
            throw new Error(`一言接口状态异常: ${quoteRes.status}`);
        }
        const quoteData = await quoteRes.json();

        const hasData = weatherData !== null;
        const tempNum = hasData ? parseInt(weatherData.temperature) : null;
        
        let tip = "愿你拥有美好的一天";
        if (hasData) {
            if (tempNum <= 10) tip = "天冷，记得多穿件衣服";
            else if (tempNum >= 30) tip = "天热，注意防暑防晒";
            else if (weatherData.weather.includes("雨")) tip = "出门记得带把伞";
        }

        return {
            quote: quoteData.hitokoto,
            from: quoteData.from,
            city: hasData ? weatherData.city : targetCity,
            temp: hasData ? weatherData.temperature : "N/A",
            desc: hasData ? weatherData.weather : "数据同步中",
            wind: hasData ? `${weatherData.wind_direction} ${weatherData.wind_power}级` : "--",
            humidity: hasData ? weatherData.humidity : "--",
            tip: tip,
            date: new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric' })
        };
    } catch (error) {
        console.error("处理流程失败:", error);
        return null;
    }
}

async function sendDailyMail() {
    const { EMAIL_USER, EMAIL_PASS, RECEIVER_EMAIL } = process.env;

    if (!EMAIL_USER || !EMAIL_PASS || !RECEIVER_EMAIL) {
        console.error("缺少必要环境变量，请检查 EMAIL_USER、EMAIL_PASS、RECEIVER_EMAIL 是否已配置");
        process.exit(1);
    }

    const data = await getMorningData();

    if (!data) {
        console.error("未获取到日报数据，邮件发送终止");
        process.exit(1);
    }

    const recipients = RECEIVER_EMAIL.split(',').map(email => email.trim());
    const transporter = nodemailer.createTransport({
        service: "qq",
        port: 465,
        secure: true,
        auth: { user: EMAIL_USER, pass: EMAIL_PASS }
    });

    for (const to of recipients) {
        try {
            const mailOptions = {
                from: `"每日早报" <${EMAIL_USER}>`,
                to: to,
                subject: `早安简报 | ${data.date}`,
                html: `
                    <div style="max-width: 500px; margin: 20px auto; border: 1px solid #eee; border-radius: 20px; font-family: 'Microsoft YaHei', sans-serif; overflow: hidden; background-color: #ffffff; box-shadow: 0 15px 35px rgba(0,0,0,0.1);">
                        <div style="background-color: #0052d9; background-image: linear-gradient(135deg, #0052d9 0%, #0072ff 100%); padding: 40px 20px; text-align: center;">
                            <div style="font-size: 14px; margin-bottom: 10px; color: #ffffff !important;">${data.date} · ${data.city}</div>
                            <div style="font-size: 56px; font-weight: bold; margin-bottom: 10px; color: #ffffff !important;">${data.temp === 'N/A' ? data.temp : data.temp + '°C'}</div>
                            <div style="font-size: 22px; letter-spacing: 2px; color: #ffffff !important;">${data.desc}</div>
                        </div>
                        
                        <div style="display: table; width: 100%; background: #f8f9ff; padding: 15px 0; border-bottom: 1px solid #edf2f7;">
                            <div style="display: table-cell; text-align: center; color: #555555; font-size: 13px;">风向：${data.wind}</div>
                            <div style="display: table-cell; text-align: center; color: #555555; font-size: 13px;">湿度：${data.humidity === '--' ? data.humidity : `${data.humidity}%`}</div>
                        </div>

                        <div style="padding: 35px; background-color: #ffffff;">
                            <div style="font-size: 14px; color: #999999; margin-bottom: 15px; border-left: 3px solid #0052d9; padding-left: 10px;">今日寄语</div>
                            <div style="font-size: 18px; color: #333333 !important; line-height: 1.8;">“${data.quote}”</div>
                            <div style="text-align: right; color: #666666 !important; margin-top: 25px; font-style: italic;">—— ${data.from}</div>
                        </div>

                        <div style="background-color: #fcfcfc; padding: 15px; border-top: 1px solid #f0f0f0; text-align: center; font-size: 13px; color: #0052d9 !important; font-weight: bold;">
                            温馨提示：${data.tip}
                        </div>
                    </div>
                `
            };
            await transporter.sendMail(mailOptions);
            console.log(`已送达: ${to}`);
        } catch (err) {
            console.error(`送达失败: ${to}`, err.message);
        }
    }
}

sendDailyMail();
