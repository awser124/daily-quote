const nodemailer = require("nodemailer");

async function getMorningData() {
    try {
        // 1. 获取名言
        const quoteRes = await fetch("https://v1.hitokoto.cn");
        const quoteData = await quoteRes.json();

        // 2. 获取天气 (使用 uapis.cn 接口)
        // 你可以把这里的 '襄阳' 改成你母亲所在的城市，如 '上海', '北京' 等
        const targetCity = "襄阳"; 
        const weatherRes = await fetch(`https://uapis.cn/api/v1/misc/weather?city=${encodeURIComponent(targetCity)}`);
        const weatherData = await weatherRes.json();

        // 检查返回数据是否有效 (根据你提供的示例，直接读取字段)
        const hasData = weatherData && weatherData.city;

        if (!hasData) {
            console.error("天气 API 返回异常");
        }

        return {
            quote: quoteData.hitokoto,
            from: quoteData.from,
            city: hasData ? weatherData.city : "未知城市",
            temp: hasData ? weatherData.temperature : "N/A",
            desc: hasData ? weatherData.weather : "获取中",
            wind: hasData ? `${weatherData.wind_direction}${weatherData.wind_power}级` : "--",
            humidity: hasData ? weatherData.humidity : "--",
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
        console.error("配置缺失或数据获取失败");
        process.exit(1);
    }

    const recipients = RECEIVER_EMAIL.split(',').map(email => email.trim());
    const transporter = nodemailer.createTransport({
        service: "qq",
        port: 465,
        secure: true,
        auth: { user: EMAIL_USER, pass: EMAIL_PASS }
    });

    console.log(`准备群发给: ${recipients.length} 位联系人`);

    for (const to of recipients) {
        try {
            const mailOptions = {
                from: `"每日早报" <${EMAIL_USER}>`,
                to: to,
                subject: `早安简报 | ${data.date}`,
                html: `
                    <div style="max-width: 500px; margin: 20px auto; border: 1px solid #eee; border-radius: 20px; font-family: 'Microsoft YaHei', sans-serif; overflow: hidden; box-shadow: 0 15px 35px rgba(0,0,0,0.1); background-color: #fff;">
                        <div style="background: linear-gradient(135deg, #0052d9 0%, #0072ff 100%); color: #ffffff !important; padding: 40px 20px; text-align: center;">
                            <div style="font-size: 14px; opacity: 0.9; margin-bottom: 10px; color: #ffffff !important;">${data.date} · ${data.city}</div>
                            <div style="font-size: 56px; font-weight: bold; margin-bottom: 10px; color: #ffffff !important;">${data.temp === 'N/A' ? data.temp : data.temp + '°C'}</div>
                            <div style="font-size: 22px; letter-spacing: 2px; color: #ffffff !important;">${data.desc}</div>
                        </div>
                        
                        <div style="display: flex; justify-content: space-around; background: #f8f9ff; padding: 15px 0; border-bottom: 1px solid #edf2f7; color: #555; font-size: 13px;">
                            <span>风向：${data.wind}</span>
                            <span>湿度：${data.humidity}%</span>
                        </div>

                        <div style="padding: 35px; background: #ffffff;">
                            <div style="font-size: 14px; color: #999; margin-bottom: 15px; border-left: 3px solid #0052d9; padding-left: 10px;">今日寄语</div>
                            <div style="font-size: 18px; color: #333333 !important; line-height: 1.8; font-weight: 400;">
                                “${data.quote}”
                            </div>
                            <div style="text-align: right; color: #666666 !important; margin-top: 25px; font-style: italic;">
                                —— ${data.from}
                            </div>
                        </div>

                        <div style="background: #fcfcfc; padding: 15px; border-top: 1px solid #f0f0f0; text-align: center; font-size: 12px; color: #aaaaaa !important;">
                            愿这份早报开启您愉快的一天
                        </div>
                    </div>
                `
            };
            await transporter.sendMail(mailOptions);
            console.log(`成功送达: ${to}`);
        } catch (err) {
            console.error(`送达 ${to} 时出错:`, err.message);
        }
    }
}

sendDailyMail();
