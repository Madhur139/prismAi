/*
  CROSSWORD ENGINE
  - Utility logic for creating/checking crossword-style data.
  - Pure logic lives here so the React game component stays focused on UI.
*/


export function blankGrid(grid){return grid.map(r=>r.map(c=>c?'':''))}
export function buildCrossword(clues){
  const words=(clues||[])
    .map((c,i)=>({
      word:String(c.word||c.answer||'').replace(/[^A-Za-z]/g,'').toUpperCase(),
      clue:String(c.clue||c.question||''),
      original:i
    }))
    .filter(x=>x.word.length>=3&&x.word.length<=15)
    .slice(0,10)
    .sort((a,b)=>b.word.length-a.word.length);

  const size=17;
  const grid=Array.from({length:size},()=>Array(size).fill(''));
  const placements=[];

  const inside=(r,c)=>r>=0&&c>=0&&r<size&&c<size;

  // A placement is valid when every occupied cell either is empty or
  // contains the crossing letter. Perpendicular neighbours are allowed
  // only at the actual crossing cell; this prevents accidental touching.
  const fits=(word,row,col,dir)=>{
    if(row<0||col<0)return false;
    if(dir==='A'&&col+word.length>size)return false;
    if(dir==='D'&&row+word.length>size)return false;

    const dr=dir==='D'?1:0, dc=dir==='A'?1:0;

    const before=[row-dr,col-dc];
    const after=[row+dr*word.length,col+dc*word.length];
    if(inside(...before)&&grid[before[0]][before[1]])return false;
    if(inside(...after)&&grid[after[0]][after[1]])return false;

    for(let k=0;k<word.length;k++){
      const r=row+dr*k,c=col+dc*k,cur=grid[r][c];
      if(cur&&cur!==word[k])return false;

      // If this is a crossing, the perpendicular neighbours belong to the
      // existing word and are therefore permitted. For a new cell, they
      // must be empty.
      if(!cur){
        const sideA=dir==='A'?[r-1,c]:[r,c-1];
        const sideB=dir==='A'?[r+1,c]:[r,c+1];
        if(inside(...sideA)&&grid[sideA[0]][sideA[1]])return false;
        if(inside(...sideB)&&grid[sideB[0]][sideB[1]])return false;
      }
    }
    return true;
  };

  const place=(word,row,col,dir)=>{
    const dr=dir==='D'?1:0,dc=dir==='A'?1:0;
    for(let k=0;k<word.length;k++){
      const r=row+dr*k,c=col+dc*k;
      grid[r][c]=word[k];
    }
    placements.push({word,row,col,dir});
  };

  if(words[0]){
    const row=Math.floor(size/2);
    const col=Math.max(1,Math.floor((size-words[0].word.length)/2));
    place(words[0].word,row,col,'A');
  }

  for(const w of words.slice(1)){
    let best=null;

    // Prefer real letter crossings.
    for(const p of placements){
      for(let a=0;a<p.word.length;a++){
        for(let b=0;b<w.word.length;b++){
          if(p.word[a]!==w.word[b])continue;
          const dir=p.dir==='A'?'D':'A';
          const row=dir==='A'?p.row-b:p.row+a;
          const col=dir==='A'?p.col+a:p.col-b;
          if(fits(w.word,row,col,dir)){
            const score=100-(Math.abs(row-size/2)+Math.abs(col-size/2));
            if(!best||score>best.score)best={row,col,dir,score};
          }
        }
      }
    }

    // If no crossing fits, place the word without touching existing words.
    if(!best){
      for(let r=1;r<size-1&&!best;r++){
        for(let c=1;c<size-1&&!best;c++){
          for(const dir of ['A','D']){
            if(fits(w.word,r,c,dir)){best={row:r,col:c,dir,score:0};break;}
          }
        }
      }
    }
    if(best)place(w.word,best.row,best.col,best.dir);
  }

  // Assign conventional crossword numbers: same starting cell shares a number.
  const numberByStart=new Map();
  let nextNumber=1;
  const numbered=[];
  for(const p of placements){
    const key=`${p.row},${p.col}`;
    if(!numberByStart.has(key))numberByStart.set(key,nextNumber++);
    numbered.push({
      num:numberByStart.get(key),
      word:p.word,
      clue:words.find(w=>w.word===p.word)?.clue||'',
      dir:p.dir,
      row:p.row,
      col:p.col
    });
  }
  numbered.sort((a,b)=>a.num-b.num||a.dir.localeCompare(b.dir));
  return {grid,size,numbered};
}
