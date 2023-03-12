const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const docx = require('docx');

const baseUrl = 'https://language.chinadaily.com.cn/news_bilingual/'

async function getHtml (url) {
  let res = await axios.get(url)
  return res.data
}

async function getAllArticelUrl (url, page = 10) {
  let allPagesRequest = []
  for(let i = 1; i <= page; i++) {
    let r = axios.get(url + `page_${i}.html`)
    allPagesRequest.push(r)
  }
  let res_list = await Promise.all(allPagesRequest)
  let allArticelsUrl = []
  res_list.forEach(item => {
    const html = item.data;
    const $ = cheerio.load(html);
    const links = $('.gy_box_img');
    links.each((_, link) => {
      let href = 'https://' + $(link).attr('href').slice(2)
      allArticelsUrl.push(href)
    });
  })
  return allArticelsUrl
}

function dealHtml (data) {
  const $ = cheerio.load(data);
  let title_zh = $('.main_title1').text().replace(/【.*】/g, "");
  let title_en = $('.main_title2').text();
  let list = $('.mian_txt > p').map((_, ele) => $(ele).text()).toArray().filter(item => item.trim().length > 0).slice(1)
  // 处理来源
  let pos = -1
  for(let i = list.length -1; i >= 0; i --) {
    if (list[i].match(/^【相关词汇】/)) {
      pos = i
      break
    }
  }
  if (pos) {
    list = list.slice(0, pos)
  }
  if (pos == -1) {
    for(let i = list.length -1; i >= 0; i --) {
      if (list[i].match(/^来源：/)) {
        pos = i
        break
      }
    }
    if (pos) {
      list = list.slice(0, pos)
    }
  }
  // 添加空段落
  let p_list = []
  list.forEach((item, index) => {
    p_list.push(item)
    if (index % 2 == 1) {
      p_list.push('')
    }
  })
  return {
    title_zh,
    title_en,
    p_list
  }
}

function generateDocx (rawData) {
  let { title_en, title_zh, p_list} = rawData

  const titleZh = new docx.Paragraph({
    heading: docx.HeadingLevel.HEADING_1,
    alignment: docx.AlignmentType.CENTER,
    spacing: {
      line: 360,
    },
    children: [
      new docx.TextRun({
        text: title_zh,
        bold: true,
        font: '宋体',
        size: 28,
        color: '#000000'
      })
    ]
  });

  const titleEn = new docx.Paragraph({
    heading: docx.HeadingLevel.HEADING_1,
    alignment: docx.AlignmentType.CENTER,
    spacing: {
      line: 360,
    },
    children: [
      new docx.TextRun({
        text: title_en,
        bold: true,
        font: 'Times New Roman',
        size: 28,
        color: '#000000'
      })
    ]
  });
  
  let paragraphs = p_list.map((text, index) => {
    const para = new docx.Paragraph({
      spacing: {
        line: 360,
      },
      indent: {
        firstLine: 420,
      },
      children: [
        new docx.TextRun({
          text,
          font: index % 3 == 0 ? 'Times New Roman' : '宋体',
          size: 24,
        })
      ]
    });
    return para
  })
  return [titleEn, titleZh, ...paragraphs]

}

async function main () {
  let urls = await getAllArticelUrl(baseUrl, 30)
  let all = []
  let index = 0, total = 0
  while (1) {
    let html = await getHtml(urls[index])
    let rawData = dealHtml(html)
    const chineseRegex = /[\u4E00-\u9FFF]/; // 中文范围
    const englishRegex = /[a-zA-Z]/; // 英文范围
    let hasEnAndZh = chineseRegex.test(rawData.p_list[0])
    if (rawData.title_en && rawData.title_zh && !hasEnAndZh) {
      all.push(...generateDocx(rawData))
      total ++
      console.log('total:' + total);
      console.log('index:' + index);
      if (total == 200) {
        break
      }
    }
    index ++
  }
  const doc = new docx.Document({
    sections: [{
      children: all
    }]
  });
  docx.Packer.toBuffer(doc).then((buffer) => {
    // 将 buffer 写入文件
    fs.writeFileSync('./test.docx', buffer)
  });
}
main()
