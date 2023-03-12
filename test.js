const axios = require("axios");
const cheerio = require('cheerio')
const fs = require('fs')
const docx = require('docx');

async function getHtml (url) {
  let res = await axios.get(url)
  return res.data
}

function dealHtml (data) {
  const $ = cheerio.load(data);
  let title_zh = $('.main_title1').text();
  let title_en = $('.main_title2').text();
  let list = $('.mian_txt > p').map((_, ele) => $(ele).text()).toArray().filter(item => item.trim().length > 0).slice(1)
  // 处理来源
  let pos = -1
  for(let i = list.length -1; i >= 0; i --) {
    if (list[i].match(/^来源：/)) {
      pos = i
      break
    }
  }
  if (pos) {
    list = list.slice(0, pos)
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
  
  const doc = new docx.Document({
    sections: [{
      children: [titleEn, titleZh, ...paragraphs]
    }]
  });

  docx.Packer.toBuffer(doc).then((buffer) => {
    // 将 buffer 写入文件
    fs.writeFileSync('./test.docx', buffer)
  });
}

async function main () {
  try {
    let html = await getHtml("https://language.chinadaily.com.cn/a/202303/09/WS6409ac5ca31057c47ebb35a0.html")
    let article = dealHtml(html)
    generateDocx(article)
  } catch (e) {
    console.log(e);
  }
}

main()