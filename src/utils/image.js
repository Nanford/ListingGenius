export const fetchImageAsBase64 = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`下载图片失败，状态码: ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  return buffer.toString('base64');
};
