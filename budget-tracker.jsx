import { useState, useEffect, useRef, useCallback } from "react";

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────
const TOTAL_BUDGET = 3_500_000;
const ROUGH_TOTAL  = 1_407_526; // 1,307,526 работы + 100,000 натяжные потолки
const SAFETY       = 350_000;
const AVAILABLE    = TOTAL_BUDGET - ROUGH_TOTAL - SAFETY; // 1,742,474
const STORAGE_KEY  = "ilusha-design-2026-v1";

const STATUS = {
  planned:  { label: "Запланировано", dot: "#B8A878", bg: "#F5F0E4" },
  selected: { label: "Подобрано",     dot: "#5A9AB8", bg: "#E6F1F8" },
  paid:     { label: "Оплачено",      dot: "#4A9A5A", bg: "#E6F5EA" },
};

const uid = () => Math.random().toString(36).slice(2);

const mk = (name, planned = 0) => ({
  id: uid(), name,
  planned, selected: 0, paid: 0,
  url: "", imageUrl: "", imageData: "", comment: "",
  alts: [],
});

const DEFAULT_CATS = [
  { id:"finish",     name:"Чистовая отделка",    icon:"🪣", color:"#8DB5C8", budget: 460000,
    subs:[ mk("Инженерная доска / паркет",254900), mk("Керамогранит",127600),
           mk("Краска (стены + потолок)",59100),   mk("Декоративная штукатурка",9400),
           mk("Плинтусы",13700),                   mk("Затирка и лак",3000),
           mk("Доставка материалов",20300) ] },
  { id:"furniture",  name:"Мебель",               icon:"🛋️", color:"#B8A3C8", budget: 291000,
    subs:[ mk("Диван",100000),              mk("Матрас",65000),
           mk("Тумба под TV",14400),        mk("Барная стойка (на заказ)",60900),
           mk("Стулья барные (×2)",0),      mk("Журнальный столик",29100),
           mk("Полка для обуви + вешалка",7300), mk("Сборка и доставка",14200) ] },
  { id:"kitchen",    name:"Кухня на заказ",        icon:"🍳", color:"#A3C8B8", budget: 500000,
    subs:[ mk("Корпусная кухня (на заказ)",316800), mk("Столешница искусственный камень",134500),
           mk("Смеситель кухонный",11300),          mk("Диспенсер + арматура мойки",9300),
           mk("Монтаж и доставка кухни",28100) ] },
  { id:"appliances", name:"Бытовая техника",       icon:"📺", color:"#C8C0A3", budget: 197000,
    subs:[ mk("Телевизор 70\"",39400),      mk("Холодильник встраиваемый",35100),
           mk("Стиральная машина",30500),   mk("Духовой шкаф",44100),
           mk("Варочная панель",8000),      mk("Чайник + тостер",21200),
           mk("Умные колонки (×2)",24600), mk("Пылесос + отпариватель",3300),
           mk("Роутер Wi-Fi",2700) ] },
  { id:"lighting",   name:"Свет и электрика",      icon:"💡", color:"#D4C87E", budget: 164000,
    subs:[ mk("Светильники потолочные (с/у, кухня, коридор)",53500),
           mk("Светильники встраиваемые (гостиная)",30800),
           mk("Светодиодная лента RGB",32900), mk("Розетки и выключатели Donel R98",25300),
           mk("Торшер напольный",0),            mk("Лампы настольные",30500),
           mk("Доставка",900) ] },
  { id:"decor",      name:"Декор, текстиль, С/У",  icon:"🪞", color:"#C8A97E", budget: 131000,
    subs:[ mk("Ванна",16000),                mk("Унитаз + инсталляция",13900),
           mk("Раковина + столешница С/У",9100), mk("Смесители С/У",6300),
           mk("Полотенцесушитель + аксессуары С/У",3700), mk("Климат-контроль",18300),
           mk("Двери + фурнитура",10500),    mk("Корпусная мебель С/У",16600),
           mk("Зеркала",9400),               mk("Шторы и тюль",700),
           mk("Постельное бельё + подушки",11800), mk("Картины, вазы, декор",4700),
           mk("Кухня: сантехника + аксессуары",18000) ] },
];

const ROUGH_GROUPS = [
  { g:"Демонтаж", items:[{n:"Стены и отделка",a:118500},{n:"Полы",a:18900},{n:"Потолки",a:9900},{n:"Окна и двери",a:3000},{n:"Электрика",a:3680},{n:"Сантехника",a:4350}]},
  { g:"Стены",    items:[{n:"Штукатурка гипс (105 м²)",a:89250},{n:"Штукатурка ЦПС (20 м²)",a:19000},{n:"Перегородки ПГП (12 м²)",a:12000},{n:"Шпатлёвка базовая",a:47250},{n:"Шлифовка + грунтовка",a:47350},{n:"Окраска стен",a:45150},{n:"Обои под окраску",a:73500},{n:"Прочие стены",a:51920}]},
  { g:"Полы",     items:[{n:"Полусухая стяжка (33 м²)",a:46200},{n:"Керамзит + армирование",a:16500},{n:"Укладка покрытия (30 м²)",a:18000},{n:"Плинтусы + окраска",a:27880},{n:"Прочее",a:17700}]},
  { g:"Потолки",  items:[{n:"Натяжной потолок с нишами (33 м²)",a:100000,note:"⚠ уточнить у подрядчика"}]},
  { g:"Электрика",items:[{n:"Разводка кабелей (250 п.м.)",a:37500},{n:"Щит + автоматы + КУП",a:28880},{n:"Подрозетники + штрабы",a:38630},{n:"Розетки + выключатели (49 шт)",a:24450},{n:"Прочая электрика",a:26250}]},
  { g:"Сантехника",items:[{n:"Трубы и коллекторы",a:19700},{n:"Инсталляция унитаза",a:5500},{n:"Водорозетки (11 шт)",a:30800},{n:"Вентиляция",a:16200},{n:"Установка сантехники",a:38710},{n:"Гидроизоляция + герметик",a:9140},{n:"Прочая сантехника",a:38160}]},
  { g:"Плитка",   items:[{n:"Мелкоформатная (10 м²)",a:65000},{n:"Крупноформатная (13 м²)",a:52000},{n:"Затирка (23 м²)",a:6900},{n:"Резка + откосы",a:24060}]},
  { g:"Окна и двери",items:[{n:"Откосы + подоконники",a:26600}]},
  { g:"Прочее",   items:[{n:"Укрывные работы + уборка",a:30300}]},
];

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────
const fmt  = n => n===0?"—":new Intl.NumberFormat("ru-RU",{maximumFractionDigits:0}).format(Math.round(n))+" ₽";
const fmtK = n => n<=0?"—":(n>=1e6?(n/1e6).toFixed(1)+"М":Math.round(n/1e3)+"К")+" ₽";
const pct  = (a,b) => b===0?0:Math.min(100,Math.round(a/b*100));

// ─────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────
function SubImage({src, linkUrl}){
  const [err,setErr]=useState(false);
  if(!src) return null;
  if(err&&!src.startsWith("data:")) return(
    <a href={linkUrl||src} target="_blank" rel="noreferrer"
       style={{fontSize:11,fontFamily:"'DM Mono',monospace",color:"#8DB5C8",textDecoration:"none",flexShrink:0}}>🔗 фото</a>
  );
  return <img src={src} alt="" onError={()=>setErr(true)}
    style={{width:64,height:64,objectFit:"contain",background:"#F9F6F1",borderRadius:6,border:"1px solid #EDE7DC",flexShrink:0,cursor:"pointer"}}
    onClick={()=>{if(linkUrl)window.open(linkUrl,"_blank");}}/>;
}

function ImagePicker({imageUrl,imageData,url,onChange}){
  const [drag,setDrag]=useState(false);
  const ref=useRef();
  const zoneRef=useRef();

  const handleFile=f=>{
    if(!f||!f.type.startsWith("image/"))return;
    const r=new FileReader();
    r.onload=e=>onChange({imageData:e.target.result,imageUrl:""});
    r.readAsDataURL(f);
  };

  // Paste handler: attached to the drop zone div via onPaste
  const handlePaste=e=>{
    const items=[...(e.clipboardData?.items||[])];
    const img=items.find(i=>i.type.startsWith("image/"));
    if(img){ e.preventDefault(); handleFile(img.getAsFile()); }
  };

  const src=imageData||imageUrl||null;
  return(
    <div>
      <div className="mono" style={{fontSize:9,color:"#9A8A72",marginBottom:6}}>ИЗОБРАЖЕНИЕ</div>
      <div style={{display:"flex",gap:10,alignItems:"flex-start",flexWrap:"wrap"}}>
        <div
          ref={zoneRef}
          tabIndex={0}
          onDragOver={e=>{e.preventDefault();setDrag(true);}}
          onDragLeave={()=>setDrag(false)}
          onDrop={e=>{e.preventDefault();setDrag(false);handleFile(e.dataTransfer.files[0]);}}
          onPaste={handlePaste}
          onClick={()=>{ if(!src){ ref.current.click(); } else { zoneRef.current?.focus(); } }}
          style={{width:80,height:80,borderRadius:8,flexShrink:0,cursor:"pointer",
            border:drag?"2px dashed #C8A97E":"2px dashed #DDD5C4",
            background:drag?"#FDF5E4":"#FDFAF6",display:"flex",alignItems:"center",
            justifyContent:"center",overflow:"hidden",position:"relative",transition:"all .15s",
            outline:"none"}}
          title="Клик — выбрать файл · Перетащи · Ctrl+V — вставить из буфера">
          {src?<>
            <img src={src} alt="" style={{width:"100%",height:"100%",objectFit:"contain",background:"#F9F6F1"}}/>
            <button onClick={e=>{e.stopPropagation();onChange({imageData:"",imageUrl:""});}}
              style={{position:"absolute",top:3,right:3,background:"rgba(44,36,22,.7)",border:"none",
                borderRadius:"50%",width:18,height:18,cursor:"pointer",color:"white",fontSize:10,
                display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
          </>:<div style={{textAlign:"center",padding:6}}>
            <div style={{fontSize:18,marginBottom:2}}>📎</div>
            <div className="mono" style={{fontSize:8,color:"#9A8A72",lineHeight:1.4}}>
              клик / перетащи<br/><b>Ctrl+V</b> вставить
            </div>
          </div>}
        </div>
        <input ref={ref} type="file" accept="image/*" style={{display:"none"}} onChange={e=>handleFile(e.target.files[0])}/>
        <div style={{flex:1,minWidth:160,display:"flex",flexDirection:"column",gap:6}}>
          <div>
            <div className="mono" style={{fontSize:9,color:"#9A8A72",marginBottom:3}}>ССЫЛКА НА КАРТИНКУ</div>
            <input type="text" placeholder="https://...jpg"
              value={imageUrl} onChange={e=>onChange({imageUrl:e.target.value,imageData:""})}
              style={{width:"100%"}}/>
          </div>
          {src&&!imageData&&<button onClick={()=>ref.current.click()} className="ghost-btn" style={{alignSelf:"flex-start"}}>заменить файлом</button>}
          {!src&&<div className="mono" style={{fontSize:9,color:"#BBA",lineHeight:1.5}}>
            Скопируй картинку на сайте<br/>(правая кнопка → Копировать)<br/>затем кликни квадрат и нажми Ctrl+V
          </div>}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SAVE INDICATOR
// ─────────────────────────────────────────────
function SaveBadge({status}){
  const styles={
    saving:  {bg:"#FDF5E4",color:"#8A6A12",text:"сохраняю…"},
    saved:   {bg:"#E6F5EA",color:"#2A6A2A",text:"✓ сохранено"},
    error:   {bg:"#FAE0D4",color:"#8A2A1A",text:"⚠ ошибка сохранения"},
    loading: {bg:"#E6F1F8",color:"#1A5A7A",text:"загружаю…"},
  }[status]||null;
  if(!styles) return null;
  return(
    <div className="mono" style={{fontSize:10,padding:"3px 10px",borderRadius:10,
      background:styles.bg,color:styles.color,letterSpacing:".04em"}}>
      {styles.text}
    </div>
  );
}

// ─────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────
export default function App(){
  // Detect view-only mode: URL contains ?view or #view
  const isViewer = typeof window !== "undefined" &&
    (window.location.search.includes("view") || window.location.hash.includes("view"));

  const [cats,setCats]         = useState(null);
  const [safetyBuf,setSafetyBuf] = useState(SAFETY); // dynamic reserve
  const [tab,setTab]           = useState("overview");
  const [openCats,setOpenCats] = useState({});
  const [openSubs,setOpenSubs] = useState({});
  const [openRough,setOpenRough]= useState({});
  const [altModal,setAltModal] = useState(null);
  const [newAlt,setNewAlt]     = useState({name:"",url:"",imageUrl:"",imageData:"",price:"",comment:""});
  const [saveStatus,setSaveStatus]= useState(null);
  const [lastSync,setLastSync] = useState(null); // for viewer
  const saveTimer  = useRef(null);
  const pollTimer  = useRef(null);

  const loadData = async (quiet=false) => {
    if(!quiet) setSaveStatus("loading");
    try{
      const res = await window.storage.get(STORAGE_KEY, true);
      if(res?.value){
        const parsed = JSON.parse(res.value);
        setCats(parsed.cats || parsed); // back-compat: old saves were just cats array
        if(parsed.safetyBuf !== undefined) setSafetyBuf(parsed.safetyBuf);
        setLastSync(new Date());
        if(!quiet) setSaveStatus("saved");
      } else {
        if(!isViewer){ setCats(DEFAULT_CATS); setSafetyBuf(SAFETY); }
        if(!quiet) setSaveStatus(null);
      }
    }catch(e){
      if(!isViewer){ setCats(DEFAULT_CATS); setSafetyBuf(SAFETY); }
      if(!quiet) setSaveStatus(null);
    }
  };

  // ── LOAD on mount ──
  useEffect(()=>{ loadData(); },[]);

  // ── VIEWER: poll every 20 seconds for updates ──
  useEffect(()=>{
    if(!isViewer) return;
    pollTimer.current = setInterval(()=>loadData(true), 20000);
    return ()=>clearInterval(pollTimer.current);
  },[isViewer]);

  // ── EDITOR: auto-save whenever cats or safetyBuf changes ──
  useEffect(()=>{
    if(!cats || isViewer) return;
    clearTimeout(saveTimer.current);
    setSaveStatus("saving");
    saveTimer.current = setTimeout(async()=>{
      try{
        await window.storage.set(STORAGE_KEY, JSON.stringify({cats, safetyBuf}), true);
        setSaveStatus("saved");
        setTimeout(()=>setSaveStatus(null),2500);
      }catch(e){ setSaveStatus("error"); }
    }, 800);
  },[cats, safetyBuf]);

  // ── RESET to defaults ──
  const handleReset = async () => {
    if(!window.confirm("Сбросить все данные к начальным значениям?")) return;
    try{ await window.storage.delete(STORAGE_KEY, true); }catch(e){}
    setCats(DEFAULT_CATS);
    setSafetyBuf(SAFETY);
  };

  // ── EXPORT ──
  const handleExport = () => {
    const data = {cats, safetyBuf, exportedAt: new Date().toISOString(), version:"ilusha-design-2026"};
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:"application/json"});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `ilusha-design-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── IMPORT ──
  const importRef = useRef();
  const handleImport = async e => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = async ev => {
      try{
        const data = JSON.parse(ev.target.result);
        if(!data.cats) throw new Error("Неверный формат");
        if(!window.confirm(`Загрузить данные от ${data.exportedAt?.slice(0,10)||"неизвестно"}? Текущие данные будут заменены.`)) return;
        setCats(data.cats);
        if(data.safetyBuf !== undefined) setSafetyBuf(data.safetyBuf);
      }catch(err){ alert("Ошибка: "+err.message); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  if(!cats) return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",
      fontFamily:"'DM Mono',monospace",fontSize:13,color:"#9A8A72",background:"#F7F4EF",gap:10}}>
      <div style={{fontSize:20}}>⏳</div>
      {isViewer ? "Загружаю данные проекта…" : "Загружаю данные…"}
    </div>
  );

  // ── COMPUTED ──
  const flexTotal     = cats.reduce((s,c)=>s+c.budget,0);
  const allocated     = ROUGH_TOTAL+flexTotal+safetyBuf;
  const overBudget    = allocated>TOTAL_BUDGET;
  const totalPlanned  = cats.flatMap(c=>c.subs).reduce((s,x)=>s+x.planned,0);
  const totalSelected = cats.flatMap(c=>c.subs).reduce((s,x)=>s+x.selected,0);
  const totalPaid     = cats.flatMap(c=>c.subs).reduce((s,x)=>s+x.paid,0);

  // Smart slider: pulls increase from reserve, returns decrease to reserve
  // Floor = sum of all "selected" subs (locked amount)
  const handleCatBudget = (catId, newVal) => {
    const cat = cats.find(c=>c.id===catId);
    const lockedFloor = cat.subs.reduce((s,x)=>s+x.selected,0);
    const clamped = Math.max(lockedFloor, newVal);
    const diff = clamped - cat.budget; // positive = increase, negative = decrease
    const newReserve = safetyBuf - diff;
    if(newReserve < 0) return; // can't exceed total budget
    setSafetyBuf(newReserve);
    setCats(p=>p.map(c=>c.id!==catId?c:{...c,budget:clamped}));
  };

  const updSub = (cid,sid,patch) =>
    setCats(p=>p.map(c=>c.id!==cid?c:{...c,subs:c.subs.map(s=>s.id!==sid?s:{...s,...patch})}));

  const addAlt = ()=>{
    if(!altModal||!newAlt.name)return;
    const {catId,subId}=altModal;
    const sub=cats.find(c=>c.id===catId).subs.find(s=>s.id===subId);
    updSub(catId,subId,{alts:[...(sub.alts||[]),{id:uid(),...newAlt}]});
    setNewAlt({name:"",url:"",imageUrl:"",imageData:"",price:"",comment:""});
  };
  const removeAlt=(cid,sid,aid)=>{
    const sub=cats.find(c=>c.id===cid).subs.find(s=>s.id===sid);
    updSub(cid,sid,{alts:sub.alts.filter(a=>a.id!==aid)});
  };

  const maxBar = Math.max(...cats.map(c=>c.budget),ROUGH_TOTAL);

  return(
<div style={{fontFamily:"'Cormorant Garamond',Georgia,serif",background:"#F7F4EF",minHeight:"100vh",color:"#2C2416",zoom:1.4}}>
<style>{`
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=DM+Mono:wght@300;400&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
.mono{font-family:'DM Mono',monospace;}
input,textarea{font-family:'DM Mono',monospace;font-size:11px;color:#2C2416;background:#FDFAF6;border:1px solid #DDD5C4;border-radius:3px;padding:4px 7px;}
input:focus,textarea:focus{outline:none;border-color:#C8A97E;background:white;}
input[type=number]{width:90px;text-align:right;}
input[type=range]{-webkit-appearance:none;width:100%;height:2px;background:#DDD5C4;border-radius:2px;outline:none;cursor:pointer;}
input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;cursor:pointer;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.2);transition:transform .15s;}
input[type=range]::-webkit-slider-thumb:hover{transform:scale(1.25);}
.tab{background:none;border:none;padding:9px 13px;cursor:pointer;font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.09em;color:#9A8A72;border-bottom:2px solid transparent;transition:all .2s;white-space:nowrap;}
.tab.on{color:#F7F4EF;border-bottom-color:#C8A97E;}
.tab:hover:not(.on){color:#C8B89A;}
.card{background:white;border-radius:8px;padding:14px 16px;margin-bottom:12px;box-shadow:0 1px 5px rgba(44,36,22,.07);}
.exp-btn{background:none;border:none;cursor:pointer;font-family:'DM Mono',monospace;font-size:10px;color:#C8A97E;display:flex;align-items:center;gap:5px;transition:opacity .15s;padding:0;}
.exp-btn:hover{opacity:.7;}
.sub-sep{border-bottom:1px solid #F5F0E8;padding:12px 0;}
.sub-sep:last-child{border-bottom:none;}
.bar-bg{height:5px;background:#EDE7DC;border-radius:3px;overflow:hidden;}
.bar-fill{height:100%;border-radius:3px;transition:width .4s ease;}
.badge{display:inline-block;padding:2px 8px;border-radius:10px;font-family:'DM Mono',monospace;font-size:10px;}
.ghost-btn{background:none;border:1px dashed #C8B89A;color:#9A8A72;padding:4px 10px;border-radius:4px;cursor:pointer;font-family:'DM Mono',monospace;font-size:10px;transition:all .15s;}
.ghost-btn:hover{border-color:#C8A97E;color:#C8A97E;}
.icon-btn{background:none;border:none;cursor:pointer;font-size:14px;padding:2px 4px;border-radius:3px;transition:background .15s;}
.icon-btn:hover{background:#F0EAE0;}
.overlay{position:fixed;inset:0;background:rgba(44,36,22,.5);z-index:100;display:flex;align-items:center;justify-content:center;padding:16px;}
.modal{background:white;border-radius:10px;padding:22px;width:100%;max-width:420px;max-height:90vh;overflow-y:auto;}
.danger-btn{background:none;border:1px solid #C8A0A0;color:#B05050;padding:5px 12px;border-radius:4px;cursor:pointer;font-family:'DM Mono',monospace;font-size:10px;transition:all .15s;}
.danger-btn:hover{background:#B05050;color:white;}
`}</style>

{/* ── HEADER ── */}
<div style={{background:"#2C2416",color:"#F7F4EF",padding:"22px 18px 0"}}>
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:4}}>
    <div className="mono" style={{fontSize:9,letterSpacing:".18em",color:"#C8A97E"}}>БЮДЖЕТ РЕМОНТА</div>
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      {isViewer
        ? <>
            <div className="mono" style={{fontSize:10,padding:"3px 10px",borderRadius:10,
              background:"#E6F1F8",color:"#1A5A7A"}}>
              👁 режим просмотра
            </div>
            {lastSync&&<div className="mono" style={{fontSize:9,color:"#6A5A42"}}>
              обновлено {lastSync.toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"})}
            </div>}
            <button className="ghost-btn" onClick={()=>loadData(true)} style={{fontSize:10,padding:"3px 10px"}}>
              ↻ обновить
            </button>
          </>
        : <>
            <SaveBadge status={saveStatus}/>
            <button onClick={handleExport}
              style={{background:"none",border:"1px solid #4A6A5A",color:"#8ACAAA",padding:"5px 12px",
                borderRadius:4,cursor:"pointer",fontFamily:"'DM Mono',monospace",fontSize:10}}>
              ↓ экспорт
            </button>
            <button onClick={()=>importRef.current.click()}
              style={{background:"none",border:"1px solid #4A5A6A",color:"#8AAACA",padding:"5px 12px",
                borderRadius:4,cursor:"pointer",fontFamily:"'DM Mono',monospace",fontSize:10}}>
              ↑ импорт
            </button>
            <input ref={importRef} type="file" accept=".json" style={{display:"none"}} onChange={handleImport}/>
            <button className="danger-btn" style={{borderColor:"#6A4A4A",color:"#C89A9A"}} onClick={handleReset}>↩ сброс</button>
          </>
      }
    </div>
  </div>
  <h1 style={{fontWeight:300,fontSize:22,marginBottom:14}}>Ilusha Design 2026</h1>

  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:14}}>
    {[
      {l:"БЮДЖЕТ",       v:fmt(TOTAL_BUDGET)},
      {l:"РАСПРЕДЕЛЕНО", v:fmt(allocated), warn:overBudget},
      {l:overBudget?"ПРЕВЫШЕНИЕ":"СВОБОДНО", v:fmt(Math.abs(TOTAL_BUDGET-allocated)), warn:overBudget},
    ].map(s=>(
      <div key={s.l}>
        <div className="mono" style={{fontSize:9,letterSpacing:".12em",color:"#8A7A62",marginBottom:3}}>{s.l}</div>
        <div style={{fontSize:15,fontWeight:300,color:s.warn?"#F0A070":"#F7F4EF"}}>{s.v}</div>
      </div>
    ))}
  </div>

  <div style={{height:4,background:"#3C3426",borderRadius:2,overflow:"hidden",marginBottom:4}}>
    <div style={{display:"flex",height:"100%"}}>
      <div style={{width:`${pct(ROUGH_TOTAL,TOTAL_BUDGET)}%`,background:"#C8A97E"}}/>
      <div style={{width:`${pct(flexTotal,TOTAL_BUDGET)}%`,background:"#8DB5C8"}}/>
      <div style={{width:`${pct(safetyBuf,TOTAL_BUDGET)}%`,background:"#A3B899"}}/>
    </div>
  </div>
  <div className="mono" style={{display:"flex",gap:12,fontSize:9,color:"#6A5A42",flexWrap:"wrap",paddingBottom:3}}>
    <span>▪ Черновые {pct(ROUGH_TOTAL,TOTAL_BUDGET)}%</span>
    <span>▪ Чистовые+мебель {pct(flexTotal,TOTAL_BUDGET)}%</span>
    <span>▪ Резерв {pct(safetyBuf,TOTAL_BUDGET)}%</span>
  </div>

  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,background:"#1E1810",
    borderRadius:6,padding:"10px 14px",margin:"12px 0 0"}}>
    {[
      {l:"ЗАПЛАНИРОВАНО",v:totalPlanned,  c:STATUS.planned.dot},
      {l:"ПОДОБРАНО",    v:totalSelected, c:STATUS.selected.dot},
      {l:"ОПЛАЧЕНО",     v:totalPaid,     c:STATUS.paid.dot},
    ].map(s=>(
      <div key={s.l}>
        <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:3}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:s.c,flexShrink:0}}/>
          <span className="mono" style={{fontSize:9,color:"#8A7A62",letterSpacing:".07em"}}>{s.l}</span>
        </div>
        <div className="mono" style={{fontSize:13,color:"#F7F4EF"}}>{s.v>0?fmtK(s.v):"—"}</div>
      </div>
    ))}
  </div>

  <div style={{display:"flex",borderTop:"1px solid #3C3426",marginTop:14,overflowX:"auto"}}>
    {[["overview","ОБЗОР"],["rough","ЧЕРНОВЫЕ"],["flexible","КАТЕГОРИИ"],["chart","ДИАГРАММА"]].map(([id,lbl])=>(
      <button key={id} className={`tab ${tab===id?"on":""}`} onClick={()=>setTab(id)}>{lbl}</button>
    ))}
  </div>
</div>

{/* ── CONTENT ── */}
<div style={{padding:"14px 14px 48px"}}>

{/* OVERVIEW */}
{tab==="overview"&&(<div>
  <div className="card">
    <div className="mono" style={{fontSize:10,color:"#9A8A72",letterSpacing:".1em",marginBottom:12}}>СТРУКТУРА БЮДЖЕТА</div>
    {[
      {name:"Черновые работы",  amount:ROUGH_TOTAL, color:"#C8A97E", note:"А4РЕМОНТ — зафиксировано", fixed:true},
      ...cats.map(c=>({name:c.icon+" "+c.name, amount:c.budget, color:c.color})),
      {name:"🛡 Резервный фонд", amount:safetyBuf,     color:"#A3B899", note:"10% — неприкосновенный", fixed:true},
    ].map((item,i)=>(
      <div key={i} style={{padding:"9px 0",borderBottom:"1px solid #F5F0E8"}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
          <div>
            <span style={{fontSize:14}}>{item.name}</span>
            {item.fixed&&<span className="badge" style={{background:"#EDE7DC",color:"#7A6A52",marginLeft:7}}>фикс</span>}
            {item.note&&<div className="mono" style={{fontSize:10,color:"#9A8A72",marginTop:1}}>{item.note}</div>}
          </div>
          <div style={{textAlign:"right"}}>
            <div className="mono" style={{fontSize:13}}>{fmt(item.amount)}</div>
            <div className="mono" style={{fontSize:10,color:"#9A8A72"}}>{pct(item.amount,TOTAL_BUDGET)}%</div>
          </div>
        </div>
        <div className="bar-bg"><div className="bar-fill" style={{width:`${(item.amount/maxBar)*100}%`,background:item.color}}/></div>
      </div>
    ))}
    <div style={{paddingTop:10,display:"flex",justifyContent:"space-between"}}>
      <span style={{fontSize:14}}>Итого распределено</span>
      <span className="mono" style={{fontSize:14,color:overBudget?"#C05030":"#2A6A2A"}}>{fmt(allocated)}</span>
    </div>
  </div>

  <div className="card" style={{background:"#FDF5E4",border:"1px solid #E8D8A0"}}>
    <div className="mono" style={{fontSize:10,color:"#7A5A12",marginBottom:8}}>⚠ КЛЮЧЕВЫЕ МОМЕНТЫ</div>
    <ul style={{paddingLeft:16,fontSize:13,lineHeight:1.9,color:"#5A4A22"}}>
      <li>Потолки — заложено <b>100 000 ₽</b> в черновой смете. ⚠ Уточнить у подрядчика</li>
      <li>Черновые = <b>{pct(ROUGH_TOTAL,TOTAL_BUDGET)}%</b> бюджета (норма 25–35%) — немного выше нормы</li>
      <li>На чистовую + мебель без резерва: <b>{fmt(AVAILABLE)}</b></li>
    </ul>
  </div>

  <div className="card" style={{border:"2px solid #A3B899",background:"#F2F8F3"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
      <div>
        <div className="mono" style={{fontSize:10,letterSpacing:".1em",color:"#3A7A4A",marginBottom:4}}>🛡 РЕЗЕРВНЫЙ ФОНД</div>
        <div style={{fontSize:26,fontWeight:300,color:"#2A5A32"}}>{fmt(safetyBuf)}</div>
        <div className="mono" style={{fontSize:10,color:"#5A8A6A",marginTop:2}}>{pct(safetyBuf,TOTAL_BUDGET)}% от базового бюджета</div>
      </div>
      <div style={{textAlign:"right"}}>
        <div className="mono" style={{fontSize:10,color:"#5A8A6A",marginBottom:4}}>РЕКОМЕНДУЕТСЯ</div>
        <div className="mono" style={{fontSize:13,color:"#3A7A4A"}}>≥ 10%</div>
      </div>
    </div>
    <div style={{height:8,background:"#C8E8CC",borderRadius:4,overflow:"hidden",marginBottom:8}}>
      <div style={{width:`${pct(safetyBuf,TOTAL_BUDGET*0.15)}%`,height:"100%",background:"#4A9A5A",borderRadius:4}}/>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
      {[
        {l:"Непредвиденное",  v:"~200К ₽",         warn:false},
        {l:"Непредвиденное 2", v:"~150К ₽", warn:false},
      ].map(x=>(
        <div key={x.l} style={{background:x.warn?"#FDF5E4":"white",borderRadius:5,padding:"7px 9px",
          border:`1px solid ${x.warn?"#E8D8A0":"#C8E8CC"}`}}>
          <div className="mono" style={{fontSize:9,color:"#7A8A7A",marginBottom:3}}>{x.l}</div>
          <div className="mono" style={{fontSize:12,color:x.warn?"#8A5A12":"#2A5A32"}}>{x.v}</div>
        </div>
      ))}
    </div>
  </div>
</div>)}

{/* ROUGH */}
{tab==="rough"&&(<div>
  {ROUGH_GROUPS.map(group=>{
    const total=group.items.reduce((s,i)=>s+i.a,0);
    const isOpen=openRough[group.g];
    return(
      <div key={group.g} className="card" style={{padding:"13px 15px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <button className="exp-btn" onClick={()=>setOpenRough(p=>({...p,[group.g]:!p[group.g]}))}>
            <span>{isOpen?"▾":"▸"}</span>
            <span style={{fontSize:15,color:"#2C2416",fontFamily:"'Cormorant Garamond',serif"}}>{group.g}</span>
            {group.g==="Потолки"&&<span className="badge" style={{background:"#FDF5E4",color:"#7A5A12"}}>TBD</span>}
          </button>
          <span className="mono" style={{fontSize:13}}>{total===0?"—":fmt(total)}</span>
        </div>
        <div className="bar-bg" style={{marginTop:7}}>
          <div className="bar-fill" style={{width:`${(total/385420)*100}%`,background:"#C8A97E"}}/>
        </div>
        {isOpen&&(
          <div style={{marginTop:10,paddingTop:10,borderTop:"1px solid #F5F0E8"}}>
            {group.items.map(item=>(
              <div key={item.n} style={{padding:"8px 0",borderBottom:"1px solid #F9F5F0"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{fontSize:13,color:"#4A3A22"}}>{item.n}
                    {item.note&&<span className="mono" style={{fontSize:10,color:"#C8A050",marginLeft:6}}>{item.note}</span>}
                  </span>
                  <span className="mono" style={{fontSize:12}}>{item.a===0?"—":fmt(item.a)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  })}
  <div className="card" style={{background:"#EDE7DC"}}>
    <div style={{display:"flex",justifyContent:"space-between"}}>
      <span className="mono" style={{fontSize:11,color:"#5A4A32"}}>ИТОГО (вкл. накладные 10%)</span>
      <span className="mono" style={{fontSize:15}}>{fmt(ROUGH_TOTAL)}</span>
    </div>
  </div>
</div>)}

{/* FLEXIBLE */}
{tab==="flexible"&&(<div>
  <div className="mono" style={{fontSize:10,color:"#9A8A72",marginBottom:10,letterSpacing:".07em"}}>
    {isViewer
      ? "ПРОСМОТР — обновляется каждые 20 сек"
      : "КАТЕГОРИИ — данные сохраняются автоматически"}
  </div>
  {cats.map(cat=>{
    const isCatOpen=openCats[cat.id];
    const catPlanned=cat.subs.reduce((s,x)=>s+x.planned,0);
    const catSelected=cat.subs.reduce((s,x)=>s+x.selected,0);
    const catPaid=cat.subs.reduce((s,x)=>s+x.paid,0);
    const lockedFloor=catSelected; // can't go below selected
    const maxSlider=cat.budget+safetyBuf; // can't take more than reserve has
    return(
      <div key={cat.id} className="card">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
          <button className="exp-btn" onClick={()=>setOpenCats(p=>({...p,[cat.id]:!p[cat.id]}))}>
            <span style={{fontSize:13}}>{isCatOpen?"▾":"▸"}</span>
            <span style={{fontSize:16}}>{cat.icon}</span>
            <span style={{fontSize:15,color:"#2C2416",fontFamily:"'Cormorant Garamond',serif"}}>{cat.name}</span>
          </button>
          <div style={{textAlign:"right"}}>
            <div className="mono" style={{fontSize:13}}>{fmt(cat.budget)}</div>
            <div style={{display:"flex",gap:4,justifyContent:"flex-end",alignItems:"center",marginTop:2}}>
              {lockedFloor>0&&<span title={`🔒 подобрано ${fmt(lockedFloor)} — нельзя урезать ниже`}
                style={{fontSize:11,cursor:"help"}}>🔒</span>}
              <div className="mono" style={{fontSize:10,color:"#9A8A72"}}>{pct(cat.budget,TOTAL_BUDGET)}%</div>
            </div>
          </div>
        </div>
        {!isViewer&&<>
          <input type="range" min={lockedFloor} max={maxSlider} step={5000} value={cat.budget}
            onChange={e=>handleCatBudget(cat.id,+e.target.value)}
            style={{accentColor:cat.color,marginBottom:4}}/>
          {/* Reserve indicator */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{display:"flex",alignItems:"center",gap:6}}>
              {lockedFloor>0&&<span className="mono" style={{fontSize:10,color:STATUS.selected.dot}}>
                🔒 подобрано {fmt(lockedFloor)} — минимум
              </span>}
            </div>
            <div className="mono" style={{fontSize:10,
              color:safetyBuf<50000?"#C05030":safetyBuf<150000?"#8A6A12":"#4A7A4A"}}>
              🛡 резерв: {fmt(safetyBuf)}
            </div>
          </div>
        </>}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:isCatOpen?12:0}}>
          {[{l:"Запланировано",v:catPlanned,s:STATUS.planned},{l:"Подобрано",v:catSelected,s:STATUS.selected},{l:"Оплачено",v:catPaid,s:STATUS.paid}].map(x=>(
            <div key={x.l} style={{background:x.s.bg,borderRadius:5,padding:"6px 8px"}}>
              <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:2}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:x.s.dot,flexShrink:0}}/>
                <span className="mono" style={{fontSize:9,color:"#7A6A52"}}>{x.l}</span>
              </div>
              <div className="mono" style={{fontSize:12}}>{x.v>0?fmtK(x.v):"—"}</div>
            </div>
          ))}
        </div>

        {isCatOpen&&(<div style={{borderTop:"1px solid #F0EAE0",paddingTop:12}}>
          {cat.subs.map(sub=>{
            const isSubOpen=openSubs[sub.id];
            return(
              <div key={sub.id} className="sub-sep">
                <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
                  <button className="exp-btn" style={{marginTop:3,flexShrink:0}}
                    onClick={()=>setOpenSubs(p=>({...p,[sub.id]:!p[sub.id]}))}>
                    <span style={{fontSize:11}}>{isSubOpen?"▾":"▸"}</span>
                  </button>
                  {/* Thumbnail — always shown, placeholder if no image */}
                  {(sub.imageData||sub.imageUrl)
                    ? <img src={sub.imageData||sub.imageUrl} alt=""
                        style={{width:48,height:48,objectFit:"contain",background:"#F9F6F1",borderRadius:6,
                          border:"1px solid #EDE7DC",flexShrink:0,cursor:sub.url?"pointer":"default"}}
                        onClick={()=>sub.url&&window.open(sub.url,"_blank")}
                        onError={e=>e.target.style.display="none"}
                      />
                    : !isViewer&&<div
                        onClick={()=>setOpenSubs(p=>({...p,[sub.id]:true}))}
                        title="Раскрой чтобы добавить фото"
                        style={{width:48,height:48,borderRadius:6,border:"1px dashed #DDD5C4",
                          flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",
                          cursor:"pointer",background:"#FDFAF6",transition:"border-color .15s"}}
                        onMouseEnter={e=>e.currentTarget.style.borderColor="#C8A97E"}
                        onMouseLeave={e=>e.currentTarget.style.borderColor="#DDD5C4"}>
                        <span style={{fontSize:16,opacity:.4}}>📷</span>
                      </div>
                  }
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:8}}>
                      <span style={{fontSize:14,lineHeight:1.3}}>{sub.name}</span>
                      {sub.alts?.length>0&&<span className="badge" style={{background:"#EDE7DC",color:"#7A6A52",flexShrink:0}}>{sub.alts.length} альт.</span>}
                    </div>
                    {sub.url&&<a href={sub.url} target="_blank" rel="noreferrer"
                      style={{fontSize:11,fontFamily:"'DM Mono',monospace",color:"#8DB5C8",display:"block",
                        marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:220}}>
                      🔗 {sub.url.replace(/^https?:\/\/(www\.)?/,"")}
                    </a>}
                    {sub.comment&&<div style={{fontSize:12,color:"#7A6A52",marginTop:2,fontStyle:"italic",lineHeight:1.4}}>{sub.comment}</div>}
                  </div>
                </div>

                {isSubOpen&&(<div style={{marginTop:12,paddingLeft:20}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:12}}>
                    {["planned","selected","paid"].map(field=>(
                      <div key={field}>
                        <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:4}}>
                          <div style={{width:6,height:6,borderRadius:"50%",background:STATUS[field].dot}}/>
                          <span className="mono" style={{fontSize:9,color:"#7A6A52"}}>{STATUS[field].label.toUpperCase()}</span>
                        </div>
                        {isViewer
                          ? <div className="mono" style={{fontSize:13,color:"#2C2416"}}>{sub[field]>0?fmt(sub[field]):"—"}</div>
                          : <input type="number" placeholder="0" value={sub[field]||""}
                              onChange={e=>updSub(cat.id,sub.id,{[field]:+e.target.value||0})}/>
                        }
                      </div>
                    ))}
                  </div>
                  {!isViewer&&<div style={{marginBottom:8}}>
                    <div className="mono" style={{fontSize:9,color:"#9A8A72",marginBottom:4}}>ССЫЛКА НА ТОВАР</div>
                    <input type="text" placeholder="https://..." value={sub.url}
                      onChange={e=>updSub(cat.id,sub.id,{url:e.target.value})}
                      style={{width:"100%",marginBottom:10}}/>
                    <ImagePicker imageUrl={sub.imageUrl} imageData={sub.imageData} url={sub.url}
                      onChange={patch=>updSub(cat.id,sub.id,patch)}/>
                  </div>}
                  {isViewer&&sub.url&&<div style={{marginBottom:8}}>
                    <a href={sub.url} target="_blank" rel="noreferrer"
                      style={{fontSize:12,fontFamily:"'DM Mono',monospace",color:"#8DB5C8"}}>🔗 открыть ссылку</a>
                  </div>}
                  {!isViewer&&<div style={{marginBottom:8}}>
                    <div className="mono" style={{fontSize:9,color:"#9A8A72",marginBottom:4}}>КОММЕНТАРИЙ</div>
                    <textarea rows={2} placeholder="Заметки, детали, размеры, цвет..."
                      value={sub.comment} onChange={e=>updSub(cat.id,sub.id,{comment:e.target.value})}
                      style={{width:"100%",resize:"vertical"}}/>
                  </div>}
                  {isViewer&&sub.comment&&<div style={{marginBottom:8,fontSize:13,color:"#7A6A52",fontStyle:"italic"}}>{sub.comment}</div>}
                  <div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                      <div className="mono" style={{fontSize:9,color:"#9A8A72"}}>АЛЬТЕРНАТИВЫ</div>
                      {!isViewer&&<button className="ghost-btn" onClick={()=>setAltModal({catId:cat.id,subId:sub.id})}>+ добавить</button>}
                    </div>
                    {(sub.alts||[]).map(alt=>(
                      <div key={alt.id} style={{background:"#F9F6F1",borderRadius:6,padding:"8px 10px",marginBottom:6,display:"flex",gap:8,alignItems:"flex-start"}}>
                        <SubImage src={alt.imageData||alt.imageUrl||alt.url} linkUrl={alt.url}/>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                            <span style={{fontSize:13}}>{alt.name}</span>
                            <div style={{display:"flex",gap:4,flexShrink:0}}>
                              {alt.price&&<span className="mono" style={{fontSize:11,color:"#5A4A32"}}>{alt.price} ₽</span>}
                              <button className="icon-btn" onClick={()=>removeAlt(cat.id,sub.id,alt.id)}>✕</button>
                            </div>
                          </div>
                          {alt.url&&<a href={alt.url} target="_blank" rel="noreferrer"
                            style={{fontSize:10,fontFamily:"'DM Mono',monospace",color:"#8DB5C8",display:"block",
                              marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                            🔗 {alt.url.replace(/^https?:\/\/(www\.)?/,"")}
                          </a>}
                          {alt.comment&&<div style={{fontSize:11,color:"#7A6A52",marginTop:2,fontStyle:"italic"}}>{alt.comment}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>)}
              </div>
            );
          })}
          <div style={{paddingTop:10,marginTop:4,display:"grid",gridTemplateColumns:"1fr 90px 90px 90px",
            gap:"0 8px",borderTop:"1px solid #EDE7DC"}}>
            <span className="mono" style={{fontSize:10,color:"#7A6A52"}}>ИТОГО КАТЕГОРИЯ</span>
            {[catPlanned,catSelected,catPaid].map((v,i)=>(
              <div key={i} className="mono" style={{fontSize:11,textAlign:"right",
                color:i===0&&v>cat.budget?"#C05030":"#2C2416"}}>{v>0?fmt(v):"—"}</div>
            ))}
          </div>
        </div>)}
      </div>
    );
  })}
  <div className="card" style={{background:"#2C2416",color:"#F7F4EF"}}>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8}}>
      {[{l:"ЛИМИТ",v:flexTotal},{l:"ЗАПЛАНИРОВАНО",v:totalPlanned},{l:"ПОДОБРАНО",v:totalSelected},{l:"ОПЛАЧЕНО",v:totalPaid}].map(s=>(
        <div key={s.l}>
          <div className="mono" style={{fontSize:9,color:"#8A7A62",marginBottom:3}}>{s.l}</div>
          <div className="mono" style={{fontSize:13,color:s.l!=="ЛИМИТ"&&s.v>flexTotal?"#F0A070":"#F7F4EF"}}>
            {s.v>0?fmt(s.v):"—"}
          </div>
        </div>
      ))}
    </div>
  </div>
</div>)}

{/* CHART */}
{tab==="chart"&&(<div>
  <div className="card">
    <div className="mono" style={{fontSize:10,color:"#9A8A72",letterSpacing:".1em",marginBottom:14}}>ВСЕ КАТЕГОРИИ</div>
    {[
      {name:"Черновые работы",      amount:ROUGH_TOTAL,color:"#C8A97E"},
      ...cats.map(c=>({name:c.icon+" "+c.name,amount:c.budget,color:c.color})),
      {name:"🛡 Резерв",             amount:safetyBuf,     color:"#A3B899"},
    ].sort((a,b)=>b.amount-a.amount).map((item,i)=>(
      <div key={i} style={{marginBottom:12}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
          <span style={{fontSize:13}}>{item.name}</span>
          <span className="mono" style={{fontSize:11}}>{fmt(item.amount)} <span style={{color:"#9A8A72"}}>({pct(item.amount,TOTAL_BUDGET)}%)</span></span>
        </div>
        <div style={{height:18,background:"#EDE7DC",borderRadius:4,overflow:"hidden"}}>
          <div style={{width:`${(item.amount/ROUGH_TOTAL)*100}%`,height:"100%",background:item.color,borderRadius:4,transition:"width .5s ease"}}/>
        </div>
      </div>
    ))}
  </div>
  <div className="card">
    <div className="mono" style={{fontSize:10,color:"#9A8A72",letterSpacing:".1em",marginBottom:12}}>СТАТУСЫ — ВЕСЬ ПРОЕКТ</div>
    {[
      {l:"Лимит гибкие",  v:flexTotal,     c:"#DDD5C4"},
      {l:"Запланировано", v:totalPlanned,  c:STATUS.planned.dot},
      {l:"Подобрано",     v:totalSelected, c:STATUS.selected.dot},
      {l:"Оплачено",      v:totalPaid,     c:STATUS.paid.dot},
    ].map(item=>(
      <div key={item.l} style={{marginBottom:11}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
          <span style={{fontSize:13}}>{item.l}</span>
          <span className="mono" style={{fontSize:11}}>{item.v>0?fmt(item.v):"—"}</span>
        </div>
        <div style={{height:10,background:"#EDE7DC",borderRadius:5,overflow:"hidden"}}>
          <div style={{width:`${pct(item.v,flexTotal)}%`,height:"100%",background:item.c,borderRadius:5,transition:"width .5s"}}/>
        </div>
      </div>
    ))}
  </div>
</div>)}

</div>

{/* ALT MODAL — editor only */}
{!isViewer&&altModal&&(
  <div className="overlay" onClick={e=>{if(e.target===e.currentTarget)setAltModal(null)}}>
    <div className="modal">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={{fontSize:18,fontWeight:300}}>Добавить альтернативу</div>
        <button className="icon-btn" style={{fontSize:18}} onClick={()=>setAltModal(null)}>✕</button>
      </div>
      {[
        {field:"name",   label:"НАЗВАНИЕ *", ph:"Диван Massimo MODERNO"},
        {field:"url",    label:"ССЫЛКА",     ph:"https://..."},
        {field:"price",  label:"ЦЕНА (₽)",   ph:"190000"},
        {field:"comment",label:"КОММЕНТАРИЙ",ph:"Цвет, размер, срок..."},
      ].map(({field,label,ph})=>(
        <div key={field} style={{marginBottom:10}}>
          <div className="mono" style={{fontSize:9,color:"#9A8A72",marginBottom:4}}>{label}</div>
          <input type="text" placeholder={ph} value={newAlt[field]}
            onChange={e=>setNewAlt(p=>({...p,[field]:e.target.value}))} style={{width:"100%"}}/>
        </div>
      ))}
      <div style={{marginBottom:12}}>
        <ImagePicker imageUrl={newAlt.imageUrl} imageData={newAlt.imageData} url={newAlt.url}
          onChange={patch=>setNewAlt(p=>({...p,...patch}))}/>
      </div>
      <button onClick={addAlt}
        style={{width:"100%",background:"#2C2416",color:"#F7F4EF",border:"none",padding:"10px",
          borderRadius:5,cursor:"pointer",fontFamily:"'DM Mono',monospace",fontSize:11,letterSpacing:".07em"}}>
        ДОБАВИТЬ
      </button>
    </div>
  </div>
)}

</div>
  );
}
