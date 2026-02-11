const nodemailer = require("nodemailer");

async function getMorningData() {
    try {
        // 1. 获取名言
        const quoteRes = await fetch("https://v1.hitokoto.cn");
        const quoteData = await quoteRes.json();

        // 2. 获取 OpenWeather One Call 3.0 数据
        const lat = "39.90"; // 北京纬度
        const lon = "116.40"; // 北京经度
        const apiKey = "54c8b09e75c3d0d593d61a49aa1c08a7";
        
        // 使用 One Call 3.0 接口地址
        const weatherUrl = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=zh_cn`;
        
        const weatherRes = await fetch(weatherUrl);
        const weatherData = await weatherRes.json();

        // 检查 3.0 接口特有的 current 字段是否存在
        if (!weatherData.current) {
            console.error("API 返回异常:", weatherData.message || "未知错误");
            // 如果 API 尚未激活或报错，提供保底显示
            return {
                quote: quoteData.hitokoto,
                from: quoteData.from,
                temp: "N/A",
                desc: "天气数据待同步",
                humidity: "--",
                date: new Date().toLocaleDateString('zh-CN')
            };
        }

        const current = weatherData.current;

        return {
            quote: quoteData.hitokoto,
            from: quoteData.from,
            temp: Math.round(current.temp), // 对应你提供的 current.temp
            desc: current.weather[0].description, // 对应 current.weather.description
            humidity: current.humidity, // 对应 current.humidity
            date: new Date().toLocaleDateString('zh-CN')
        };
    } catch (error) {
        console.error("数据抓取流程异常:", error);
        return null;
    }
}

async function sendDailyMail() {
    const { EMAIL_USER, EMAIL_PASS, RECEIVER_EMAIL } = process.env;
    const data = await getMorningData();

    if (!data) {
        console.error("无法获取必要数据，取消发送");
        process.exit(1);
    }

    try {
        const transporter = nodemailer.createTransport({
            service: "qq",
            port: 465,
            secure: true,
            auth: {
                user: EMAIL_USER,
                pass: EMAIL_PASS,
            }
        });

        const mailOptions = {
            from: `"每日早报" <${EMAIL_USER}>`,
            to: RECEIVER_EMAIL,
            subject: `早安简报 | ${data.date}`,
            html: `
                <div style="max-width: 500px; margin: 20px auto; border: 1px solid #eee; border-radius: 12px; font-family: 'PingFang SC', 'Microsoft YaHei', sans-serif; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
                    <div style="background: #0052d9; color: white; padding: 25px; text-align: center;">
                        <div style="font-size: 14px; opacity: 0.9; margin-bottom: 8px;">${data.date}</div>
                        <div style="font-size: 32px; font-weight: bold;">${data.temp}℃</div>
                        <div style="font-size: 18px; margin-top: 5px;">${data.desc}</div>
                    </div>
                    
                    <div style="padding: 30px; background: white;">
                        <div style="color: #666; font-size: 14px; margin-bottom: 10px;">今日寄语：</div>
                        <div style="font-size: 18px; color: #333; line-height: 1.6; position: relative;">
                            “${data.quote}”
                        </div>
                        <div style="text-align: right; color: #999; margin-top: 15px; font-size: 15px;">
                            —— ${data.from}
                        </div>
                    </div>

                    <div style="padding: 15px; background: #f8f9fa; border-top: 1px solid #eee; display: flex; justify-content: space-around; font-size: 13px; color: #777;">
                        <span>湿度：${data.humidity}%</span>
                        <span>数据源：OpenWeather 3.0</span>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log("3.0 接口早报发送成功");
    } catch (error) {
        console.error("邮件投递失败:", error);
        process.exit(1);
    }
}

sendDailyMail();
