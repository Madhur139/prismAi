/*
  API CLIENT
  - Central place for frontend -> backend requests.
  - Keeps fetch/API logic out of the page components.
  - If the backend URL changes, this is one of the first files to check.
*/


export const API = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
export async function api(path, options={}){
  const token=localStorage.getItem('prism_token');
  const headers={...(options.headers||{})};
  if(token) headers.Authorization=`Bearer ${token}`;
  let res;try{res=await fetch(API+path,{...options,headers})}catch{throw new Error(`Cannot reach the backend at ${API}. Start the server and check VITE_API_URL and CLIENT_ORIGIN.`)}
  let data={}; try{data=await res.json()}catch{}
  if(res.status===401){localStorage.removeItem('prism_token');localStorage.removeItem('prism_user');window.dispatchEvent(new Event('prism:logout'));}
  if(!res.ok){
    const msg=data?.error || (res.status===503?'AI service is temporarily busy. Try again in a moment.':'Request failed');
    throw new Error(msg);
  }
  return data;
}
