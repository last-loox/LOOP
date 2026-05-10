import { useState, useRef, useEffect } from "react";

// ─── Script Data ──────────────────────────────────────────────────────────────
const SCRIPT_SCENES = [
  {
    id:"sc1", sceneNum:1, pageRef:"p.4",
    heading:"INT. HOSPITAL ROOM — DAY",
    characters:["SARAH","DR. CHEN"],
    lines:[
      {id:"l1a",type:"action",text:"SARAH, 30s, lies in the hospital bed. Her face is pale, bruised. A bandage covers her left temple."},
      {id:"l1b",type:"char",text:"DR. CHEN"},
      {id:"l1c",type:"dialog",text:"How are you feeling this morning?"},
      {id:"l1d",type:"paren",text:"(sits beside her)"},
      {id:"l1e",type:"char",text:"SARAH"},
      {id:"l1f",type:"dialog",text:"Like I got hit by a truck."},
      {id:"l1g",type:"action",text:"She attempts a smile. It hurts."},
    ],
  },
  {
    id:"sc2", sceneNum:2, pageRef:"p.11",
    heading:"INT. FLASHBACK — SARAH'S CHILDHOOD HOME — DAY",
    characters:["YOUNG SARAH","MOTHER"],
    lines:[
      {id:"l2a",type:"action",text:"YOUNG SARAH, 8, sits at the vanity mirror. Her mother applies lipstick, teaching her."},
      {id:"l2b",type:"char",text:"MOTHER"},
      {id:"l2c",type:"dialog",text:"Beauty is armor, baby girl."},
      {id:"l2d",type:"action",text:"Young Sarah watches, wide-eyed, memorizing every move."},
    ],
  },
  {
    id:"sc4", sceneNum:4, pageRef:"p.18",
    heading:"EXT. CITY STREET — NIGHT",
    characters:["MARCUS"],
    lines:[
      {id:"l4a",type:"action",text:"MARCUS, 40s, stumbles out of the bar. His lip is split, dried blood on his chin. His suit is torn."},
      {id:"l4b",type:"action",text:"He looks up at the rain."},
      {id:"l4c",type:"char",text:"MARCUS"},
      {id:"l4d",type:"paren",text:"(to himself)"},
      {id:"l4e",type:"dialog",text:"Never again."},
    ],
  },
  {
    id:"sc7", sceneNum:7, pageRef:"p.31",
    heading:"INT. INTERROGATION ROOM — NIGHT",
    characters:["DETECTIVE COLE","SUSPECT"],
    lines:[
      {id:"l7a",type:"action",text:"DETECTIVE COLE, 50s, weathered face, deep under-eye circles, 3-day stubble. He's been awake for 40 hours."},
      {id:"l7b",type:"action",text:"He slams a photo on the table."},
      {id:"l7c",type:"char",text:"DETECTIVE COLE"},
      {id:"l7d",type:"dialog",text:"Where were you on the night of the fourteenth?"},
      {id:"l7e",type:"char",text:"SUSPECT"},
      {id:"l7f",type:"dialog",text:"I want a lawyer."},
    ],
  },
  {
    id:"sc12", sceneNum:12, pageRef:"p.54",
    heading:"EXT. ROOFTOP — DAWN",
    characters:["SARAH","MARCUS"],
    lines:[
      {id:"l12a",type:"action",text:"SARAH stands at the edge. Wind whips her hair. Her wounds from Scene 1 are healing — stitches visible, bruising yellowed and fading."},
      {id:"l12b",type:"action",text:"MARCUS approaches from behind, slowly."},
      {id:"l12c",type:"char",text:"SARAH"},
      {id:"l12d",type:"dialog",text:"You should have left me there."},
      {id:"l12e",type:"char",text:"MARCUS"},
      {id:"l12f",type:"dialog",text:"Not a chance."},
    ],
  },
];

const CHAR_COLORS = {
  "SARAH":"#e8a838","DR. CHEN":"#38a8c8","YOUNG SARAH":"#d4956a",
  "MOTHER":"#a87bc8","MARCUS":"#5898d8","DETECTIVE COLE":"#5aa87a","SUSPECT":"#c87878",
};
const STICKY_COLORS = ["#fef08a","#fde68a","#bbf7d0","#bfdbfe","#fecaca","#e9d5ff","#fed7aa"];
const ROTATIONS    = [2, -1.5, 2.8, -2.2, 1.2, -2.6, 1.8, -1.1, 2.4, -1.8];

function cc(n){ return CHAR_COLORS[n]||"#888"; }
function ini(n){ return n.split(" ").map(w=>w[0]).join("").slice(0,2); }
const STATUS_CLR = { pending:"#e8a838", approved:"#5aa87a", denied:"#e85538" };

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [notes,       setNotes]       = useState([]);
  const [tap,         setTap]         = useState(null);
  const [draft,       setDraft]       = useState({text:"",chars:[],images:[],color:STICKY_COLORS[0]});
  const [activeNote,  setActiveNote]  = useState(null);
  const [reviewOpen,  setReviewOpen]  = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [selToolbar,  setSelToolbar]  = useState(null);
  const [toast,       setToast]       = useState(null);
  const [calModal,    setCalModal]    = useState(null);
  const [calForm,     setCalForm]     = useState({date:"",time:"",notes:""});
  const [vendorModal, setVendorModal] = useState(null);
  const [vendorForm,  setVendorForm]  = useState({name:"",contact:"",turnaround:"",notes:""});

  const fileRef        = useRef(null);
  const touchStart     = useRef(null);
  const touchSelecting = useRef(false);

  function toast_(msg, color="#e8a838"){
    setToast({msg,color});
    setTimeout(()=>setToast(null),2400);
  }

  function handleTap(sceneId, lineId, e){
    e.stopPropagation();
    setTap({sceneId, lineId});
    setDraft({text:"",chars:[],images:[],color:STICKY_COLORS[Math.floor(Math.random()*STICKY_COLORS.length)]});
  }

  function caretAt(x,y){
    if(document.caretRangeFromPoint) return document.caretRangeFromPoint(x,y);
    if(document.caretPositionFromPoint){
      const p=document.caretPositionFromPoint(x,y);
      if(!p) return null;
      const r=document.createRange(); r.setStart(p.offsetNode,p.offset); r.collapse(true); return r;
    }
    return null;
  }

  function resolveSelection(sceneId){
    if(tap) return;
    const sel=window.getSelection();
    if(!sel||sel.rangeCount===0) return;
    const txt=sel.toString().trim();
    if(txt.length<2){setSelToolbar(null);return;}
    const rect=sel.getRangeAt(0).getBoundingClientRect();
    setSelToolbar({x:rect.left+rect.width/2, y:rect.top-10, sceneId, selectedText:txt});
  }

  function onMouseUp(e,sceneId){ resolveSelection(sceneId); }

  function onTouchStart(e,sceneId){
    if(tap) return;
    const t=e.touches[0];
    touchStart.current={x:t.clientX,y:t.clientY,sceneId};
    touchSelecting.current=false;
  }

  function onTouchMove(e,sceneId){
    if(tap||!touchStart.current) return;
    const t=e.touches[0];
    if(!touchSelecting.current&&(Math.abs(t.clientX-touchStart.current.x)>8||Math.abs(t.clientY-touchStart.current.y)>8)){
      touchSelecting.current=true;
      const r=caretAt(touchStart.current.x,touchStart.current.y);
      if(r){const s=window.getSelection();s.removeAllRanges();s.addRange(r);}
    }
    if(touchSelecting.current){
      e.preventDefault();
      const r=caretAt(t.clientX,t.clientY);
      if(r){
        const s=window.getSelection();
        if(s.rangeCount>0){
          const rng=s.getRangeAt(0);
          try{rng.setEnd(r.startContainer,r.startOffset);}catch{}
          if(rng.collapsed){try{rng.setStart(r.startContainer,r.startOffset);}catch{}}
        }
      }
    }
  }

  function onTouchEnd(e,sceneId){
    if(!touchSelecting.current){touchStart.current=null;return;}
    touchSelecting.current=false; touchStart.current=null;
    setTimeout(()=>resolveSelection(sceneId),60);
  }

  function openHighlight(){
    if(!selToolbar) return;
    setDraft({text:selToolbar.selectedText,chars:[],images:[],color:STICKY_COLORS[Math.floor(Math.random()*STICKY_COLORS.length)]});
    setTap({sceneId:selToolbar.sceneId,lineId:"highlight"});
    setSelToolbar(null);
    window.getSelection()?.removeAllRanges();
  }

  function submitNote(){
    if(!draft.text.trim()) return;
    const scene=SCRIPT_SCENES.find(s=>s.id===tap.sceneId);
    const stackIdx=notes.filter(n=>n.sceneId===tap.sceneId&&n.lineId===tap.lineId).length;
    const note={
      id: Date.now().toString(),
      sceneId:tap.sceneId, lineId:tap.lineId,
      sceneNum:scene.sceneNum, sceneHeading:scene.heading, pageRef:scene.pageRef,
      characters:draft.chars, text:draft.text.trim(),
      images:draft.images, color:draft.color,
      rotation: ROTATIONS[stackIdx % ROTATIONS.length],
      stackIdx,
      status:"pending", directorComment:"",
      makeupTest:null, testStatus:null, vendor:null,
      createdAt:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}),
    };
    setNotes(p=>[...p,note]);
    setTap(null);
    setDraft({text:"",chars:[],images:[],color:STICKY_COLORS[0]});
    setReviewOpen(true);
    setActiveNote(note);
    toast_("Note posted");
  }

  function updateNote(id,patch){
    setNotes(p=>p.map(n=>n.id===id?{...n,...patch}:n));
    if(activeNote?.id===id) setActiveNote(p=>({...p,...patch}));
  }

  function handleImageUpload(e){
    Array.from(e.target.files).forEach(file=>{
      const r=new FileReader();
      r.onload=ev=>setDraft(d=>({...d,images:[...d.images,{url:ev.target.result,name:file.name}]}));
      r.readAsDataURL(file);
    });
  }

  function saveCalendar(){
    updateNote(calModal.id,{makeupTest:calForm,testStatus:"scheduled"});
    setCalModal(null); setCalForm({date:"",time:"",notes:""});
    toast_("Makeup test scheduled ✓","#5aa87a");
  }

  function saveVendor(){
    updateNote(vendorModal.id,{vendor:vendorForm});
    setVendorModal(null); setVendorForm({name:"",contact:"",turnaround:"",notes:""});
    toast_("Vendor saved ✓","#5aa87a");
  }

  const pendingCount = notes.filter(n=>n.status==="pending").length;
  const currentScene = tap ? SCRIPT_SCENES.find(s=>s.id===tap.sceneId) : null;

  return (
    <div style={{height:"100vh",background:"#4a4a4a",fontFamily:"'Helvetica Neue',Arial,sans-serif",display:"flex",flexDirection:"column",overflow:"hidden"}}>

      {/* ══ Header ══ */}
      <div style={{background:"#1a1a1a",borderBottom:"1px solid #2a2a2a",padding:"10px 20px",display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0,zIndex:300}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:18}}>💄</span>
          <span style={{color:"#e8d8b8",fontWeight:700,fontSize:14,letterSpacing:"0.05em"}}>MAKEUP DEPT</span>
          <span style={{color:"#555",fontSize:11,fontFamily:"'Courier New',monospace"}}>· Director Meeting</span>
        </div>
        <div style={{display:"flex",gap:7,alignItems:"center"}}>
          {pendingCount>0&&(
            <div style={{background:"#e85538",color:"#fff",borderRadius:20,padding:"3px 10px",fontSize:10,fontWeight:700,letterSpacing:"0.06em"}}>{pendingCount} PENDING</div>
          )}
          <button
            onClick={()=>{setReviewOpen(r=>!r); setSummaryOpen(false);}}
            style={{padding:"6px 14px",border:"1px solid #333",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:600,letterSpacing:"0.04em",transition:"all 0.2s",
              background:reviewOpen?"#e8a838":"transparent", color:reviewOpen?"#1a1a1a":"#888"}}
          >✍️ Review {reviewOpen?"◂":"▸"}</button>
          <button
            onClick={()=>{setSummaryOpen(s=>!s); setReviewOpen(false);}}
            style={{padding:"6px 14px",border:"1px solid #333",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:600,
              background:summaryOpen?"#c8b8f8":"transparent", color:summaryOpen?"#1a1a1a":"#888"}}
          >📋 Summary</button>
        </div>
      </div>

      {/* ══ Body ══ */}
      <div style={{flex:1,display:"flex",overflow:"hidden"}}>

        {/* ── Script column ── */}
        <div
          style={{
            flex:1, overflowY:"auto", overflowX:"hidden",
            padding:"32px 0 80px",
            display:"flex", justifyContent:"center",
            transition:"flex 0.38s cubic-bezier(0.4,0,0.2,1)",
            minWidth:0, position:"relative",
          }}
          onClick={()=>{if(tap)setTap(null); setSelToolbar(null);}}
        >
          {/* hint */}
          <div style={{position:"fixed",bottom:20,left:reviewOpen?"28%":"50%",transform:"translateX(-50%)",background:"#1a1a1a",color:"#777",fontSize:11,padding:"6px 16px",borderRadius:20,zIndex:50,border:"1px solid #2a2a2a",pointerEvents:"none",whiteSpace:"nowrap",transition:"left 0.38s"}}>
            👆 Tap line · ✍️ Drag to highlight
          </div>

          {/* ── The script page ── */}
          <div style={{
            width:680, background:"#fff",
            boxShadow:"0 4px 40px rgba(0,0,0,0.5), 0 1px 3px rgba(0,0,0,0.3)",
            padding:"72px 96px 96px 120px",
            position:"relative", minHeight:"100%",
            fontFamily:"'Courier Prime','Courier New',Courier,monospace",
            fontSize:"12pt", lineHeight:"1.0", color:"#000",
            userSelect:"text", WebkitUserSelect:"text",
          }}>
            <div style={{position:"absolute",top:48,right:72,fontFamily:"'Courier New',monospace",fontSize:"12pt"}}>1.</div>

            {SCRIPT_SCENES.map((scene,si)=>{
              const sceneNotes=notes.filter(n=>n.sceneId===scene.id);
              return (
                <div key={scene.id} style={{marginBottom:28}}
                  onMouseUp={e=>onMouseUp(e,scene.id)}
                  onTouchStart={e=>onTouchStart(e,scene.id)}
                  onTouchMove={e=>onTouchMove(e,scene.id)}
                  onTouchEnd={e=>onTouchEnd(e,scene.id)}
                >
                  {/* Scene heading */}
                  <div
                    onClick={e=>{if(touchSelecting.current)return; e.stopPropagation(); handleTap(scene.id,"heading",e);}}
                    style={{fontWeight:700,textTransform:"uppercase",marginBottom:12,cursor:"pointer",borderRadius:2,padding:"1px 3px",margin:"0 -3px 12px",transition:"background 0.1s"}}
                    onMouseEnter={e=>e.currentTarget.style.background="#fff9c4"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                  >{scene.heading}</div>

                  {/* Lines */}
                  {scene.lines.map(line=>{
                    const lineNotes=notes.filter(n=>n.sceneId===scene.id&&n.lineId===line.id);
                    const isTapped=tap?.sceneId===scene.id&&tap?.lineId===line.id;
                    return (
                      <div key={line.id} style={{position:"relative"}}>
                        <div
                          onClick={e=>{if(touchSelecting.current)return; e.stopPropagation(); handleTap(scene.id,line.id,e);}}
                          style={{
                            cursor:"pointer",borderRadius:2,padding:"1px 3px",margin:"0 -3px",
                            background:isTapped?"#fff9c4":"transparent",transition:"background 0.1s",
                            ...(line.type==="action"?{marginBottom:12}
                              :line.type==="char"?{marginLeft:176,marginBottom:0,textTransform:"uppercase"}
                              :line.type==="dialog"?{marginLeft:88,marginRight:88,marginBottom:12}
                              :line.type==="paren"?{marginLeft:120,marginBottom:0}:{}),
                          }}
                          onMouseEnter={e=>{if(!isTapped)e.currentTarget.style.background="#fffde7";}}
                          onMouseLeave={e=>{if(!isTapped)e.currentTarget.style.background="transparent";}}
                        >{line.text}</div>

                        {/* Sticky icons */}
                        {lineNotes.map(note=>(
                          <StickyIcon
                            key={note.id} note={note}
                            isActive={activeNote?.id===note.id}
                            onOpen={()=>{setActiveNote(note); setReviewOpen(true); setSummaryOpen(false);}}
                          />
                        ))}
                      </div>
                    );
                  })}

                  {si<SCRIPT_SCENES.length-1&&<div style={{borderBottom:"1px dashed #ccc",marginTop:24,marginBottom:0}}/>}

                  {/* Highlight-based notes anchored at scene level */}
                  {sceneNotes.filter(n=>n.lineId==="highlight").map(note=>(
                    <div key={note.id} style={{position:"relative",height:0}}>
                      <StickyIcon
                        note={note} isActive={activeNote?.id===note.id}
                        onOpen={()=>{setActiveNote(note); setReviewOpen(true); setSummaryOpen(false);}}
                      />
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {/* ── Selection toolbar ── */}
          {selToolbar&&!tap&&(
            <div onClick={e=>e.stopPropagation()} style={{
              position:"fixed",left:selToolbar.x,top:selToolbar.y,
              transform:"translate(-50%,-100%)",zIndex:600,
              display:"flex",alignItems:"center",
              background:"#1a1a1a",borderRadius:8,
              boxShadow:"0 4px 20px rgba(0,0,0,0.5)",overflow:"hidden",
            }}>
              <div style={{padding:"8px 12px",fontSize:11,color:"#888",borderRight:"1px solid #2a2a2a",maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                &ldquo;{selToolbar.selectedText.slice(0,30)}{selToolbar.selectedText.length>30?"...":""}&rdquo;
              </div>
              <button onClick={openHighlight} style={{padding:"8px 14px",background:"#e8a838",border:"none",color:"#1a1a1a",fontWeight:700,fontSize:11,cursor:"pointer",whiteSpace:"nowrap"}}>📌 Make Note</button>
              <button onClick={()=>{setSelToolbar(null);window.getSelection()?.removeAllRanges();}} style={{padding:"8px 10px",background:"transparent",border:"none",color:"#555",fontSize:13,cursor:"pointer"}}>✕</button>
              <div style={{position:"absolute",bottom:-6,left:"50%",transform:"translateX(-50%)",borderLeft:"6px solid transparent",borderRight:"6px solid transparent",borderTop:"6px solid #1a1a1a"}}/>
            </div>
          )}

          {/* ── Note composer popover ── */}
          {tap&&currentScene&&(
            <div onClick={e=>e.stopPropagation()} style={{
              position:"fixed",top:"50%",left:"50%",
              transform:"translate(-50%,-50%)",
              width:370,zIndex:500,
              background:draft.color,borderRadius:4,
              boxShadow:"4px 5px 24px rgba(0,0,0,0.42)",
              padding:"0 0 16px",
              animation:"noteIn 0.17s ease",
            }}>
              <style>{`@keyframes noteIn{from{opacity:0;transform:translate(-50%,-50%) scale(0.93)}to{opacity:1;transform:translate(-50%,-50%) scale(1)}}`}</style>

              {/* tape */}
              <div style={{display:"flex",justifyContent:"center",height:0,position:"relative",zIndex:2}}>
                <div style={{position:"absolute",top:-8,width:42,height:14,background:"rgba(255,255,255,0.52)",borderRadius:2,backdropFilter:"blur(1px)",boxShadow:"0 1px 4px rgba(0,0,0,0.1)"}}/>
              </div>

              {/* header */}
              <div style={{background:"rgba(0,0,0,0.09)",padding:"10px 14px 8px",borderRadius:"4px 4px 0 0",marginBottom:12,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span style={{fontSize:11,fontWeight:700,opacity:0.55,letterSpacing:"0.06em"}}>
                  {tap?.lineId==="highlight"?"✏️":"📌"} SC {currentScene.sceneNum} · {currentScene.pageRef}
                </span>
                <div style={{display:"flex",gap:4}}>
                  {STICKY_COLORS.map(c=>(
                    <div key={c} onClick={()=>setDraft(d=>({...d,color:c}))} style={{width:12,height:12,borderRadius:"50%",background:c,cursor:"pointer",border:draft.color===c?"2px solid #333":"2px solid transparent"}}/>
                  ))}
                </div>
              </div>

              <div style={{padding:"0 14px"}}>
                {/* character chips */}
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:9,fontWeight:700,opacity:0.45,letterSpacing:"0.09em",marginBottom:6}}>ASSIGN TO:</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                    {currentScene.characters.map(c=>{
                      const sel=draft.chars.includes(c);
                      return(
                        <div key={c} onClick={()=>setDraft(d=>({...d,chars:sel?d.chars.filter(x=>x!==c):[...d.chars,c]}))}
                          style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer",padding:"4px 10px 4px 5px",borderRadius:20,border:`1.5px solid ${sel?cc(c):"rgba(0,0,0,0.18)"}`,background:sel?cc(c)+"22":"rgba(255,255,255,0.38)",fontSize:11,fontWeight:sel?700:400}}>
                          <span style={{width:18,height:18,borderRadius:"50%",background:cc(c),color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:8,fontWeight:700}}>{ini(c)}</span>
                          {c}{sel&&<span style={{fontSize:10}}>✓</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <textarea value={draft.text} onChange={e=>setDraft(d=>({...d,text:e.target.value}))}
                  placeholder={tap?.lineId==="highlight"?"Add makeup thoughts...":"Your makeup note..."} autoFocus
                  style={{width:"100%",minHeight:90,border:"none",outline:"none",background:"transparent",resize:"vertical",fontSize:"13px",lineHeight:1.7,fontFamily:"'Georgia',serif",boxSizing:"border-box",color:"#1a1a1a"}}
                />

                {draft.images.length>0&&(
                  <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
                    {draft.images.map((img,i)=>(
                      <div key={i} style={{position:"relative"}}>
                        <img src={img.url} alt="" style={{width:52,height:52,objectFit:"cover",borderRadius:4,border:"2px solid rgba(0,0,0,0.14)"}}/>
                        <div onClick={()=>setDraft(d=>({...d,images:d.images.filter((_,j)=>j!==i)}))} style={{position:"absolute",top:-5,right:-5,width:15,height:15,background:"#e85538",borderRadius:"50%",color:"#fff",fontSize:9,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontWeight:700}}>✕</div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <button onClick={()=>fileRef.current?.click()} style={{padding:"6px 10px",background:"rgba(0,0,0,0.1)",border:"none",borderRadius:6,cursor:"pointer",fontSize:11,fontWeight:600}}>📎 Reference</button>
                  <input ref={fileRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={handleImageUpload}/>
                  <div style={{flex:1}}/>
                  <button onClick={()=>setTap(null)} style={{padding:"6px 10px",background:"rgba(0,0,0,0.1)",border:"none",borderRadius:6,cursor:"pointer",fontSize:12}}>✕</button>
                  <button onClick={submitNote} style={{padding:"7px 16px",background:"rgba(0,0,0,0.18)",border:"none",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:700}}>Post</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ══ Review panel ══ */}
        <div style={{
          width: reviewOpen ? "46%" : 0,
          minWidth: reviewOpen ? 480 : 0,
          display:"flex",
          overflow:"hidden",
          borderLeft: reviewOpen?"1px solid #2a2a2a":"none",
          background:"#1a1a1a",
          transition:"width 0.38s cubic-bezier(0.4,0,0.2,1), min-width 0.38s cubic-bezier(0.4,0,0.2,1)",
          flexShrink:0,
        }}>
          {reviewOpen&&(
            <div style={{display:"flex",width:"100%",overflow:"hidden"}}>

              {/* Note list */}
              <div style={{width:230,flexShrink:0,borderRight:"1px solid #222",overflowY:"auto",display:"flex",flexDirection:"column",background:"#161616"}}>
                <div style={{padding:"12px 14px 8px",fontSize:9,color:"#555",letterSpacing:"0.12em",textTransform:"uppercase",borderBottom:"1px solid #1e1e1e",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,background:"#161616",zIndex:5}}>
                  <span>Notes · {notes.length}</span>
                  <button onClick={()=>{setReviewOpen(false);setActiveNote(null);}} style={{background:"transparent",border:"none",color:"#444",fontSize:15,cursor:"pointer",lineHeight:1,padding:"0 2px"}}>✕</button>
                </div>

                {notes.length===0&&(
                  <div style={{padding:"20px 14px",color:"#333",fontSize:11,lineHeight:1.65}}>
                    Tap any line in the script to add a note.
                  </div>
                )}

                {notes.map(note=>(
                  <div key={note.id} onClick={()=>setActiveNote(note)}
                    style={{
                      padding:"10px 14px",cursor:"pointer",
                      borderBottom:"1px solid #1e1e1e",
                      borderLeft:`3px solid ${note.color}`,
                      background:activeNote?.id===note.id?"#1e1e1e":"transparent",
                      transition:"background 0.12s",flexShrink:0,
                    }}
                    onMouseEnter={e=>{if(activeNote?.id!==note.id)e.currentTarget.style.background="#1a1a1a";}}
                    onMouseLeave={e=>{if(activeNote?.id!==note.id)e.currentTarget.style.background="transparent";}}
                  >
                    <div style={{display:"flex",gap:5,alignItems:"center",marginBottom:4}}>
                      <span style={{width:6,height:6,borderRadius:"50%",background:STATUS_CLR[note.status]||"#888",display:"inline-block",flexShrink:0}}/>
                      <span style={{fontSize:10,color:"#e8a838",fontFamily:"'Courier New',monospace"}}>SC {note.sceneNum}</span>
                      <span style={{fontSize:10,color:"#444",fontFamily:"'Courier New',monospace"}}>{note.pageRef}</span>
                      {note.makeupTest&&<span style={{fontSize:9,marginLeft:"auto"}}>📅</span>}
                      {note.vendor&&<span style={{fontSize:9}}>🏢</span>}
                    </div>
                    <div style={{fontSize:11,color:"#999",lineHeight:1.5,marginBottom:5,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{note.text}</div>
                    {note.characters.length>0&&(
                      <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
                        {note.characters.map(c=>(
                          <span key={c} style={{display:"inline-flex",alignItems:"center",gap:3,background:cc(c)+"18",border:`1px solid ${cc(c)}33`,borderRadius:20,padding:"1px 6px 1px 3px",fontSize:9,color:cc(c),fontWeight:700}}>
                            <span style={{width:12,height:12,borderRadius:"50%",background:cc(c),color:"#fff",fontSize:6,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>{ini(c)}</span>
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Note detail */}
              <div style={{flex:1,overflowY:"auto",minWidth:0,background:"#1a1a1a"}}>
                {!activeNote
                  ? <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100%",color:"#2a2a2a",fontSize:13,flexDirection:"column",gap:10}}>
                      <div style={{fontSize:32}}>👈</div>
                      Select a note to review
                    </div>
                  : <>
                      <div style={{padding:"12px 18px",borderBottom:"1px solid #222",display:"flex",alignItems:"center",gap:8,position:"sticky",top:0,background:"#1a1a1a",zIndex:5}}>
                        <div style={{width:10,height:10,borderRadius:2,background:activeNote.color,flexShrink:0}}/>
                        <span style={{fontFamily:"'Courier New',monospace",fontSize:11,color:"#e8a838"}}>SC {activeNote.sceneNum} · {activeNote.pageRef}</span>
                        <span style={{fontSize:10,color:"#444",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{activeNote.sceneHeading}</span>
                        <StatusPill status={activeNote.status}/>
                      </div>
                      <NoteDetail
                        note={activeNote}
                        onUpdate={p=>updateNote(activeNote.id,p)}
                        onScheduleTest={()=>{setCalModal(activeNote);setCalForm(activeNote.makeupTest||{date:"",time:"",notes:""}); }}
                        onVendor={()=>{setVendorModal(activeNote);setVendorForm(activeNote.vendor||{name:"",contact:"",turnaround:"",notes:""});}}
                      />
                    </>
                }
              </div>
            </div>
          )}
        </div>

        {/* ── Summary overlay ── */}
        {summaryOpen&&(
          <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.55)",zIndex:200,display:"flex",justifyContent:"flex-end"}} onClick={()=>setSummaryOpen(false)}>
            <div onClick={e=>e.stopPropagation()} style={{width:500,background:"#1a1a1a",height:"100%",overflowY:"auto",borderLeft:"1px solid #2a2a2a",padding:"24px",animation:"slideInR 0.3s cubic-bezier(0.4,0,0.2,1)"}}>
              <style>{`@keyframes slideInR{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
                <div>
                  <div style={{color:"#e8d8b8",fontSize:17,fontWeight:700}}>Meeting Summary</div>
                  <div style={{color:"#555",fontSize:11,marginTop:3}}>For cast &amp; crew reference during shooting</div>
                </div>
                <button onClick={()=>setSummaryOpen(false)} style={{background:"transparent",border:"none",color:"#555",fontSize:18,cursor:"pointer"}}>✕</button>
              </div>

              {/* stats */}
              <div style={{display:"flex",gap:8,marginBottom:24,flexWrap:"wrap"}}>
                {[
                  {label:"TOTAL",val:notes.length,color:"#e8a838"},
                  {label:"APPROVED",val:notes.filter(n=>n.status==="approved").length,color:"#5aa87a"},
                  {label:"DENIED",val:notes.filter(n=>n.status==="denied").length,color:"#e85538"},
                  {label:"PENDING",val:notes.filter(n=>n.status==="pending").length,color:"#888"},
                  {label:"TESTS",val:notes.filter(n=>n.makeupTest).length,color:"#38a8c8"},
                  {label:"VENDORS",val:notes.filter(n=>n.vendor).length,color:"#a87bc8"},
                ].map(s=>(
                  <div key={s.label} style={{background:"#222",border:"1px solid #2a2a2a",borderRadius:8,padding:"10px 14px",flex:"1 1 70px"}}>
                    <div style={{fontSize:22,fontWeight:700,color:s.color,fontFamily:"'Courier New',monospace"}}>{s.val}</div>
                    <div style={{fontSize:9,color:"#555",letterSpacing:"0.1em"}}>{s.label}</div>
                  </div>
                ))}
              </div>

              {notes.length===0&&<div style={{color:"#444",fontSize:12,textAlign:"center",padding:"40px 0"}}>No notes yet.</div>}

              {SCRIPT_SCENES.map(scene=>{
                const sn=notes.filter(n=>n.sceneId===scene.id);
                if(!sn.length) return null;
                return(
                  <div key={scene.id} style={{background:"#222",border:"1px solid #2a2a2a",borderRadius:10,marginBottom:10,overflow:"hidden"}}>
                    <div style={{padding:"10px 14px",borderBottom:"1px solid #1a1a1a",display:"flex",gap:8,alignItems:"center"}}>
                      <span style={{fontFamily:"'Courier New',monospace",fontSize:11,color:"#e8a838",background:"#e8a83818",padding:"1px 8px",borderRadius:20}}>SC {scene.sceneNum}</span>
                      <span style={{fontSize:11,color:"#555",fontFamily:"'Courier New',monospace"}}>{scene.heading}</span>
                    </div>
                    {sn.map((note,i)=>(
                      <div key={note.id} style={{padding:"12px 14px",borderBottom:i<sn.length-1?"1px solid #1a1a1a":"none"}}>
                        <div style={{display:"flex",gap:6,alignItems:"center",marginBottom:6,flexWrap:"wrap"}}>
                          <StatusPill status={note.status}/>
                          {note.characters.map(c=><span key={c} style={{fontSize:10,color:cc(c),background:cc(c)+"18",border:`1px solid ${cc(c)}44`,borderRadius:20,padding:"1px 7px",fontWeight:700}}>{c}</span>)}
                          {note.makeupTest&&<span style={{fontSize:10,color:"#38a8c8"}}>📅 {note.makeupTest.date}</span>}
                          {note.vendor&&<span style={{fontSize:10,color:"#a87bc8"}}>🏢 {note.vendor.name} · {note.vendor.turnaround}d</span>}
                        </div>
                        <div style={{fontSize:12,color:"#bbb",lineHeight:1.65}}>{note.text}</div>
                        {note.directorComment&&(
                          <div style={{marginTop:8,padding:"7px 10px",borderRadius:6,fontSize:11,lineHeight:1.5,background:note.status==="approved"?"#182218":"#221818",color:note.status==="approved"?"#5aa87a":"#e85538",borderLeft:`2px solid ${note.status==="approved"?"#5aa87a":"#e85538"}`}}>
                            🎬 {note.directorComment}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {calModal&&(
        <Modal onClose={()=>setCalModal(null)} title="📅 Schedule Makeup Test">
          <div style={{color:"#888",fontSize:12,marginBottom:14}}>SC {calModal.sceneNum} · {calModal.characters.join(", ")||"Scene"}</div>
          <label style={lbl}>Date</label>
          <input type="date" value={calForm.date} onChange={e=>setCalForm(f=>({...f,date:e.target.value}))} style={inp}/>
          <label style={lbl}>Time</label>
          <input type="time" value={calForm.time} onChange={e=>setCalForm(f=>({...f,time:e.target.value}))} style={inp}/>
          <label style={lbl}>Notes for test day</label>
          <textarea value={calForm.notes} onChange={e=>setCalForm(f=>({...f,notes:e.target.value}))} style={{...inp,minHeight:60,resize:"vertical"}}/>
          <div style={{display:"flex",gap:8,marginTop:12}}>
            <button onClick={saveCalendar} style={btnP}>Add to Calendar ✓</button>
            <button onClick={()=>setCalModal(null)} style={btnS}>Cancel</button>
          </div>
        </Modal>
      )}
      {vendorModal&&(
        <Modal onClose={()=>setVendorModal(null)} title="🏢 Outsource to Vendor">
          <div style={{color:"#888",fontSize:12,marginBottom:14}}>SC {vendorModal.sceneNum} · {vendorModal.characters.join(", ")||"Scene"}</div>
          <label style={lbl}>Vendor / Lab Name</label>
          <input value={vendorForm.name} onChange={e=>setVendorForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Autonomous FX..." style={inp}/>
          <label style={lbl}>Contact</label>
          <input value={vendorForm.contact} onChange={e=>setVendorForm(f=>({...f,contact:e.target.value}))} placeholder="Email or phone" style={inp}/>
          <label style={lbl}>Turnaround (days)</label>
          <input type="number" value={vendorForm.turnaround} onChange={e=>setVendorForm(f=>({...f,turnaround:e.target.value}))} placeholder="14" style={inp}/>
          <label style={lbl}>Notes</label>
          <textarea value={vendorForm.notes} onChange={e=>setVendorForm(f=>({...f,notes:e.target.value}))} style={{...inp,minHeight:60,resize:"vertical"}}/>
          <div style={{display:"flex",gap:8,marginTop:12}}>
            <button onClick={saveVendor} style={btnP}>Save Vendor ✓</button>
            <button onClick={()=>setVendorModal(null)} style={btnS}>Cancel</button>
          </div>
        </Modal>
      )}

      {toast&&(
        <div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:"#1a1a1a",border:`1px solid ${toast.color}55`,borderRadius:24,padding:"8px 18px",fontSize:12,color:toast.color,fontWeight:700,letterSpacing:"0.06em",boxShadow:"0 8px 32px #00000099",zIndex:900}}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

// ─── Sticky Icon ──────────────────────────────────────────────────────────────
function StickyIcon({ note, onOpen, isActive }) {
  const [hover, setHover] = useState(false);
  const statusColor = STATUS_CLR[note.status] || "#888";
  const rot = note.rotation || 2;
  const topOffset = (note.stackIdx || 0) * 22;

  return (
    <div
      title={note.text}
      onClick={e=>{e.stopPropagation(); onOpen();}}
      onMouseEnter={()=>setHover(true)}
      onMouseLeave={()=>setHover(false)}
      style={{
        position:"absolute",
        right: -52,
        top: topOffset,
        width: 28,
        height: 30,
        cursor:"pointer",
        zIndex: isActive ? 20 : 10 + (note.stackIdx||0),
        transform: hover
          ? `rotate(${rot*0.3}deg) scale(1.18) translateY(-1px)`
          : `rotate(${rot}deg)`,
        transition:"transform 0.16s ease, box-shadow 0.16s ease",
        filter: hover ? "brightness(1.08)" : "none",
      }}
    >
      {/* tape strip */}
      <div style={{
        position:"absolute", top:-5, left:"50%", transform:"translateX(-50%)",
        width:18, height:9,
        background:"rgba(255,255,255,0.60)",
        borderRadius:1,
        boxShadow:"0 1px 2px rgba(0,0,0,0.12)",
        zIndex:2,
      }}/>

      {/* sticky body */}
      <div style={{
        width:"100%", height:"100%",
        background: note.color,
        borderRadius:1,
        boxShadow: isActive
          ? `1px 2px 7px rgba(0,0,0,0.28), 0 0 0 2px ${statusColor}`
          : "1px 2px 6px rgba(0,0,0,0.22)",
        position:"relative",
      }}>
        <div style={{
          position:"absolute", bottom:3, right:3,
          width:5, height:5, borderRadius:"50%",
          background: statusColor,
          boxShadow:"0 0 0 1px rgba(255,255,255,0.5)",
        }}/>
      </div>
    </div>
  );
}

// ─── Note Detail ──────────────────────────────────────────────────────────────
function NoteDetail({ note, onUpdate, onScheduleTest, onVendor }) {
  const [dirComment, setDirComment] = useState(note.directorComment||"");
  const [saved, setSaved] = useState(false);
  useEffect(()=>{ setDirComment(note.directorComment||""); },[note.id]);

  function resolve(status){
    onUpdate({status, directorComment:dirComment});
    setSaved(true); setTimeout(()=>setSaved(false),1200);
  }

  return(
    <div style={{padding:"18px 20px"}}>

      {/* Characters */}
      {note.characters.length>0&&(
        <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
          {note.characters.map(c=>(
            <div key={c} style={{display:"flex",alignItems:"center",gap:5,background:cc(c)+"18",border:`1px solid ${cc(c)}44`,borderRadius:20,padding:"5px 12px 5px 5px"}}>
              <span style={{width:20,height:20,borderRadius:"50%",background:cc(c),color:"#fff",fontSize:8,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>{ini(c)}</span>
              <span style={{fontSize:11,color:cc(c),fontWeight:700,letterSpacing:"0.04em"}}>{c}</span>
            </div>
          ))}
        </div>
      )}

      {/* Note text */}
      <div style={{background:"#222",border:"1px solid #2a2a2a",borderRadius:9,padding:"13px 15px",fontSize:13,color:"#e0d8d0",lineHeight:1.75,marginBottom:14,fontFamily:"'Georgia',serif"}}>{note.text}</div>

      {/* Images */}
      {note.images?.length>0&&(
        <div style={{marginBottom:18}}>
          <div style={{fontSize:9,color:"#555",letterSpacing:"0.1em",marginBottom:8}}>VISUAL REFERENCES</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {note.images.map((img,i)=>(
              <div key={i} style={{position:"relative"}}>
                <img src={img.url} alt="" onClick={()=>window.open(img.url,"_blank")} style={{width:88,height:88,objectFit:"cover",borderRadius:7,border:"2px solid #2a2a2a",cursor:"pointer"}}/>
                <div style={{position:"absolute",bottom:0,left:0,right:0,background:"rgba(0,0,0,0.55)",borderRadius:"0 0 5px 5px",padding:"2px 5px",fontSize:8,color:"#ccc",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{img.name}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Director response */}
      <div style={{borderTop:"1px solid #222",paddingTop:16,marginBottom:16}}>
        <div style={{fontSize:9,color:"#555",letterSpacing:"0.1em",marginBottom:9}}>🎬 DIRECTOR&apos;S RESPONSE</div>
        <textarea value={dirComment} onChange={e=>setDirComment(e.target.value)}
          placeholder="Type the director's feedback or decision..."
          style={{width:"100%",minHeight:68,background:"#222",border:"1px solid #2a2a2a",borderRadius:8,padding:"10px 12px",color:"#e0d8d0",fontSize:13,lineHeight:1.65,fontFamily:"'Georgia',serif",resize:"vertical",outline:"none",boxSizing:"border-box",marginBottom:10}}
        />
        <div style={{display:"flex",gap:10}}>
          <button onClick={()=>resolve("approved")} style={{flex:1,padding:"10px",cursor:"pointer",background:note.status==="approved"?"#1e3a1e":"#182218",border:"1px solid #5aa87a55",borderRadius:8,color:"#5aa87a",fontWeight:700,fontSize:13}}>✓ APPROVE</button>
          <button onClick={()=>resolve("denied")}   style={{flex:1,padding:"10px",cursor:"pointer",background:note.status==="denied"?"#3a1e1e":"#221818",border:"1px solid #e8553855",borderRadius:8,color:"#e85538",fontWeight:700,fontSize:13}}>✕ DENY</button>
        </div>
        {saved&&<div style={{textAlign:"center",fontSize:11,color:"#5aa87a",marginTop:8}}>Saved ✓</div>}
      </div>

      {/* Makeup test */}
      <div style={{borderTop:"1px solid #222",paddingTop:16,marginBottom:16}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9}}>
          <div style={{fontSize:9,color:"#555",letterSpacing:"0.1em"}}>💋 MAKEUP TEST</div>
          <button onClick={onScheduleTest} style={{padding:"5px 13px",background:"#152228",border:"1px solid #38a8c844",borderRadius:20,color:"#38a8c8",fontSize:11,cursor:"pointer",fontWeight:600}}>{note.makeupTest?"✎ Edit Schedule":"+ Schedule Test"}</button>
        </div>
        {note.makeupTest
          ?<div style={{background:"#152228",border:"1px solid #38a8c833",borderRadius:8,padding:"11px 13px"}}>
              <div style={{fontSize:13,color:"#38a8c8",fontWeight:700,marginBottom:4,fontFamily:"'Courier New',monospace"}}>📅 {note.makeupTest.date} at {note.makeupTest.time}</div>
              {note.makeupTest.notes&&<div style={{fontSize:12,color:"#7ab8c8",lineHeight:1.5}}>{note.makeupTest.notes}</div>}
              <div style={{marginTop:9,display:"flex",gap:8}}>
                <button onClick={()=>onUpdate({testStatus:"approved"})} style={{padding:"5px 13px",background:note.testStatus==="approved"?"#5aa87a":"transparent",border:"1px solid #5aa87a55",borderRadius:20,color:note.testStatus==="approved"?"#fff":"#5aa87a",fontSize:11,cursor:"pointer",fontWeight:600}}>✓ Test Approved</button>
                <button onClick={()=>onUpdate({testStatus:"denied"})}   style={{padding:"5px 13px",background:note.testStatus==="denied"?"#e85538":"transparent",border:"1px solid #e8553855",borderRadius:20,color:note.testStatus==="denied"?"#fff":"#e85538",fontSize:11,cursor:"pointer",fontWeight:600}}>✕ Need Revision</button>
              </div>
            </div>
          :<div style={{fontSize:12,color:"#333",fontStyle:"italic"}}>No test scheduled yet.</div>
        }
      </div>

      {/* Vendor */}
      {(note.testStatus==="approved"||note.vendor)&&(
        <div style={{borderTop:"1px solid #222",paddingTop:16}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9}}>
            <div style={{fontSize:9,color:"#555",letterSpacing:"0.1em"}}>🏢 OUTSOURCE / VENDOR</div>
            <button onClick={onVendor} style={{padding:"5px 13px",background:"#1e1828",border:"1px solid #a87bc844",borderRadius:20,color:"#a87bc8",fontSize:11,cursor:"pointer",fontWeight:600}}>{note.vendor?"✎ Edit Vendor":"+ Add Vendor"}</button>
          </div>
          {note.vendor
            ?<div style={{background:"#1e1828",border:"1px solid #a87bc833",borderRadius:8,padding:"11px 13px"}}>
                <div style={{fontSize:13,color:"#a87bc8",fontWeight:700,marginBottom:4}}>{note.vendor.name}</div>
                <div style={{fontSize:12,color:"#8878a8",marginBottom:6}}>{note.vendor.contact}</div>
                <div style={{display:"inline-flex",alignItems:"center",gap:5,background:"#a87bc822",border:"1px solid #a87bc844",borderRadius:20,padding:"3px 10px",fontSize:11,color:"#a87bc8"}}>⏱ {note.vendor.turnaround} day turnaround</div>
                {note.vendor.notes&&<div style={{fontSize:12,color:"#7878a8",marginTop:8,lineHeight:1.5}}>{note.vendor.notes}</div>}
              </div>
            :<div style={{fontSize:12,color:"#333",fontStyle:"italic"}}>No vendor assigned. Add if this needs outsourcing.</div>
          }
        </div>
      )}
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
function Modal({ children, onClose, title }) {
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:800}} onClick={onClose}>
      <div style={{background:"#1e1e1e",border:"1px solid #333",borderRadius:16,padding:"22px 26px",width:420,maxWidth:"95vw",boxShadow:"0 24px 80px rgba(0,0,0,0.6)"}} onClick={e=>e.stopPropagation()}>
        <div style={{fontSize:15,fontWeight:700,color:"#e8d8b8",marginBottom:16}}>{title}</div>
        {children}
      </div>
    </div>
  );
}

// ─── StatusPill ───────────────────────────────────────────────────────────────
function StatusPill({ status }) {
  const c=STATUS_CLR[status]||"#888";
  return(
    <span style={{display:"inline-flex",alignItems:"center",gap:4,background:c+"18",border:`1px solid ${c}44`,borderRadius:20,padding:"2px 8px",fontSize:9,fontWeight:700,color:c,letterSpacing:"0.1em"}}>
      <span style={{width:5,height:5,borderRadius:"50%",background:c,display:"inline-block"}}/>{status.toUpperCase()}
    </span>
  );
}

// ─── Style constants ──────────────────────────────────────────────────────────
const lbl  = { display:"block",fontSize:10,color:"#666",letterSpacing:"0.1em",marginBottom:5,marginTop:12 };
const inp  = { width:"100%",background:"#2a2a2a",border:"1px solid #3a3a3a",borderRadius:8,padding:"9px 12px",color:"#e0d8d0",fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit" };
const btnP = { flex:1,padding:"10px 18px",background:"#e8a838",border:"none",borderRadius:8,color:"#1a1a1a",fontWeight:700,fontSize:13,cursor:"pointer" };
const btnS = { padding:"10px 16px",background:"transparent",border:"1px solid #333",borderRadius:8,color:"#666",fontSize:13,cursor:"pointer" };
