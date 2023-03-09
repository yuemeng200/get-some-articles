const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const baseUrl = 'https://language.chinadaily.com.cn/news_bilingual/'

// 爬url
let allPagesRequest = []
for(let i = 1; i <= 10; i++) {
  let r = axios.get(baseUrl + `page_${i}.html`)
  allPagesRequest.push(r)
}
let allArticelsUrl = []
Promise.all(allPagesRequest).then(res => {
  res.forEach((item, index) => {
    const html = item.data;
    const $ = cheerio.load(html);
    const links = $('.gy_box_img');
    console.log('page:' + (index + 1));
    links.each((index, link) => {
      let href = 'https://' + $(link).attr('href').slice(2)
      allArticelsUrl.push(href)
    });
  })
  console.log('文章数' + new Set(allArticelsUrl).size);
  fs.writeFileSync('./index.json', JSON.stringify(allArticelsUrl))
  // 爬取文章
  let allArticleRequest = []
  allArticelsUrl.forEach(url => {
    allArticleRequest.push(axios.get(url))
  })
  Promise.all(allArticleRequest).then(res => {
    res.forEach((item, index) => {
      const html = item.data;
      const $ = cheerio.load(html);
      let title = $('.main_title1').text()
      let list = []
      $('.mian_txt > p').each((index, element) => {
        list.push($(element).text())
      });
      list[0] = '摘要：' + list[0]
      list.unshift('题目：' + title + '\n')
      console.log('完成：' + (index + 1));
      title = title.replace('/', ' ')
      fs.writeFileSync(`./articles/${index + 1}-${title}.txt`, list.join('\n'))
    })
  }).catch(e => {
    console.log(e);
  })
}).catch(e => {
  console.log(e);
})
