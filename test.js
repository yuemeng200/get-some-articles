const axios = require("axios");
const cheerio = require('cheerio')

axios
  .get(
    "https://language.chinadaily.com.cn/a/202303/08/WS64085740a31057c47ebb3219.html",
    {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3",
      },
    }
  )
  .then((res) => {
    const html = res.data;
    const $ = cheerio.load(html);
    let list = $('.mian_txt > p')
    list.each((index, element) => {
      console.log($(element).text());
    });
  })
  .catch((e) => {
    console.log(e);
  });
