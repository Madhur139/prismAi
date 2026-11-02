const asyncHandler = require('../middleware/asyncHandler');
const genAI = require('../config/gemini');
const { GEMINI_MODEL, GOOGLE_SEARCH_API_KEY, GOOGLE_SEARCH_ENGINE_ID } = require('../config/env');

async function googleSearch(query){
  if(!GOOGLE_SEARCH_API_KEY || !GOOGLE_SEARCH_ENGINE_ID) return [];
  const url=new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('key',GOOGLE_SEARCH_API_KEY);url.searchParams.set('cx',GOOGLE_SEARCH_ENGINE_ID);url.searchParams.set('q',query);url.searchParams.set('num','6');url.searchParams.set('safe','active');
  const r=await fetch(url); if(!r.ok) throw new Error(`Google search failed (${r.status})`);
  const d=await r.json();
  return (d.items||[]).map(x=>({title:x.title,url:x.link,snippet:x.snippet||''}));
}

const searchAI=asyncHandler(async(req,res)=>{
  const query=String(req.body?.query||'').trim();
  if(!query) return res.status(400).json({error:'Ask a question first.'});
  if(query.length>800) return res.status(400).json({error:'Question is too long.'});
  let sources=[];let searchNote='';
  try{sources=await googleSearch(query);if(sources.length)searchNote='Use the Google search results below as current web context and cite the source titles/URLs in a short Sources list.';}catch(e){searchNote='Google search was unavailable, so answer from your model knowledge and clearly avoid pretending you searched the web.';}
  const context=sources.length?sources.map((s,i)=>`[${i+1}] ${s.title}\nURL: ${s.url}\nSnippet: ${s.snippet}`).join('\n\n'):'';
  const prompt=`You are Prism AI, a friendly learning assistant. Answer the user's question accurately and clearly. Prefer concise explanations, bullets, and code examples when useful. If the user asks something current and web context is provided, ground the answer in that context. Do not invent citations. ${searchNote}\n\nUser question: ${query}\n\nWEB CONTEXT:\n${context}`;
  const model=genAI.getGenerativeModel({model:GEMINI_MODEL,generationConfig:{temperature:.35}});
  const result=await model.generateContent(prompt);
  const answer=result.response.text().trim();
  res.json({answer,sources});
});
module.exports={searchAI};
