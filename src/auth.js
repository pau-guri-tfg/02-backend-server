export default function auth(request) {
  const apiKey = request.query.api_key;
  if (apiKey === process.env.INCOMING_API_KEY) {
    return true;
  } else {
    return false;
  }
}