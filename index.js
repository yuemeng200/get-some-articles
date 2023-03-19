const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const docx = require("docx");

let all_length = 0

// 获取链接的 html
async function getHtml(url) {
  let res = await axios.get(url);
  return res.data;
}

// 获取所有文章的 url
async function getAllArticelUrl(url, total = 10) {
  let htmls = await Promise.all(
    Array.from({ length: 100 }, (_, i) => i + 51).map((page) =>
      getHtml(`${url}page_${page}.html`)
    )
  );
  return htmls.map(html => {
    const $ = cheerio.load(html)
    return $('.gy_box_img').map((_, link) =>
      "https:" + $(link).attr("href")
    ).toArray()
  }).flat()
}

// 处理文章的html
function dealHtml(data) {
  const $ = cheerio.load(data);
  let title_zh = $(".main_title1")
    .text()
    .replace(/【.*】/g, "");
  let title_en = $(".main_title2").text();
  
  // 所有非空白行
  let list = $(".mian_txt > p")
    .map((_, ele) => $(ele).text())
    .toArray()
    .filter((item) => item.trim().length > 0)

  list = list.slice(1) // 去除摘要

  // 去除无效信息
  let pos = -1;
  for (let i = 0; i < list.length; i ++) {
    if (list[i].match(/^(【相关词汇】)|(来源：)/)) {
      pos = i
      break
    }  
  }
  if (pos != -1) {
    list = list.slice(0, pos)
  }
  let temp = [], len = 0
  for (let i = 1; i < list.length; i += 2) {
    temp.push(list[i], list[i - 1])
    len += list[i].length
  }

  // 添加空段落
  let p_list = [];
  temp.forEach((item, index) => {
    p_list.push(item);
    if (index % 2 == 1) {
      p_list.push("");
    }
  });
  return {
    title_zh,
    title_en,
    p_list,
    len
  };
}

function generateSection (rawData) {
  let { title_en, title_zh, p_list } = rawData;

  let titleParagraphStyle = {
    heading: docx.HeadingLevel.HEADING_1,
    alignment: docx.AlignmentType.CENTER,
    spacing: {
      line: 360,
    }
  }
  let titleTextStyle = {
    bold: true,
    size: 28,
    color: "#000000",
  }

  const titleZh = new docx.Paragraph({
    ...titleParagraphStyle,
    children: [
      new docx.TextRun({
        text: title_zh,
        font: "宋体",
        ...titleTextStyle
      }),
    ],
  });

  const titleEn = new docx.Paragraph({
    ...titleParagraphStyle,
    children: [
      new docx.TextRun({
        text: title_en,
        font: "Times New Roman",
        ...titleTextStyle,
      }),
    ],
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
          font: index % 3 == 0 ? "宋体" : "Times New Roman",
          size: 24,
        }),
      ],
    });
    return para;
  });

  return {
    properties: {
      type: docx.SectionType.NEXT_PAGE,
    },
    children: [titleZh, titleEn, ...paragraphs],
  };
}

// baseUrl, 页数, 文章数
async function main(baseUrl, page = 50, num = 200) {
  let urls = await getAllArticelUrl(baseUrl, page);
  console.log(urls);
  let sections = [];
  let index = 0,
    total = 0;
  while (all_length < 55000) {
    let html = await getHtml(urls[index]);
    let rawData = dealHtml(html);

    // 检查格式
    let hasChinese = false
    let p_list = rawData.p_list
    for (let i = 0; i < p_list.length; i ++) {
      if (i % 3 == 1 && /[\u4E00-\u9FFF]/.test(p_list[i])) {
        hasChinese = true
        break
      }
    }
    // 首段存在中文暴力丢弃
    if (rawData.title_en && rawData.title_zh && ! hasChinese) {
      all_length += rawData.len
      sections.push(generateSection(rawData))
      console.log(`completed: ${++ total}, scanNumber: ${index}, length: ${all_length}`);
    }
    index++;
  }
  
  const doc = new docx.Document({
    sections,
  });

  docx.Packer.toBuffer(doc).then((buffer) => {
    // 将 buffer 写入文件
    fs.writeFileSync("./output/test.docx", buffer);
  });
}

const baseUrl = "https://language.chinadaily.com.cn/news_bilingual/";

main(baseUrl, 50, 200);
