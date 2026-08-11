// SpeedSolve AI - Local Numerical Solver v2 (EXPANDED)
// Covers: Math, Physics, Chemistry for CBSE/ICSE/State Board 6-12
import {tryJEESolve} from "./local-solver-jee";

interface LocalSolution {
  finalAnswer: string;
  finalFormula: string;
  steps: { desc: string; formula: string }[];
  altSteps: { desc: string; formula: string }[];
  similar: string[];
  mistakes: string[];
  examTips?: string[];
}
// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════
const AM: Record<string,number> = {
  H:1,He:4,Li:7,Be:9,B:11,C:12,N:14,O:16,F:19,Ne:20,
  Na:23,Mg:24,Al:27,Si:28,P:31,S:32,Cl:35.5,Ar:40,K:39,Ca:40,
  Ti:48,V:51,Cr:52,Mn:55,Fe:56,Co:59,Ni:59,Cu:63.5,Zn:65,
  Br:80,Ag:108,I:127,Ba:137,Pb:207,Bi:209,U:238,
};
function fmt(n:number,d=4):string{if(Number.isInteger(n))return String(n);return parseFloat(n.toFixed(d)).toString()}
function fact(n:number):number{if(n<0||n>170)return NaN;if(n<=1)return 1;let r=1;for(let i=2;i<=n;i++)r*=i;return r}
function N(t:string):number[]{return(t.match(/-?\d+\.?\d*/g)||[]).map(Number)}
function pN(t:string):number[]{return(t.match(/\d+\.?\d*/g)||[]).map(Number)}

interface EC{element:string;count:number}
function parseFormula(formula:string):EC[]{
  const stack:EC[][]=[[]];let i=0;const f=formula;
  while(i<f.length){
    if(f[i]==='('){stack.push([]);i++}
    else if(f[i]===')'){
      i++;let ns='';while(i<f.length&&/\d/.test(f[i])){ns+=f[i];i++}
      const m=parseInt(ns||'1'),g=stack.pop()||[],t=stack[stack.length-1];
      for(const x of g){const e=t.find(y=>y.element===x.element);if(e)e.count+=x.count*m;else t.push({element:x.element,count:x.count*m})}
    }else if(/[A-Z]/.test(f[i])){
      let el=f[i];i++;while(i<f.length&&/[a-z]/.test(f[i])){el+=f[i];i++}
      let ns='';while(i<f.length&&/\d/.test(f[i])){ns+=f[i];i++}
      const c=parseInt(ns||'1'),t=stack[stack.length-1];
      const e=t.find(y=>y.element===el);if(e)e.count+=c;else t.push({element:el,count:c})
    }else{i++}
  }
  return stack[0];
}
function mMol(f:string):number|null{const els=parseFormula(f);if(!els.length)return null;let t=0;for(const e of els){const m=AM[e.element];if(!m)return null;t+=m*e.count}return t}

const TRIG:Record<number,{s:string;c:string;t:string}>={
  0:{s:'0',c:'1',t:'0'},30:{s:'1/2',c:'\\sqrt{3}/2',t:'1/\\sqrt{3}'},
  45:{s:'1/\\sqrt{2}',c:'1/\\sqrt{2}',t:'1'},
  60:{s:'\\sqrt{3}/2',c:'1/2',t:'\\sqrt{3}'},
  90:{s:'1',c:'0',t:'not defined'},
  120:{s:'\\sqrt{3}/2',c:'-1/2',t:'-\\sqrt{3}'},
  135:{s:'1/\\sqrt{2}',c:'-1/\\sqrt{2}',t:'-1'},
  150:{s:'1/2',c:'-\\sqrt{3}/2',t:'-1/\\sqrt{3}'},
  180:{s:'0',c:'-1',t:'0'},
  210:{s:'-1/2',c:'-\\sqrt{3}/2',t:'1/\\sqrt{3}'},
  225:{s:'-1/\\sqrt{2}',c:'-1/\\sqrt{2}',t:'1'},
  240:{s:'-\\sqrt{3}/2',c:'-1/2',t:'\\sqrt{3}'},
  270:{s:'-1',c:'0',t:'not defined'},
  300:{s:'-\\sqrt{3}/2',c:'1/2',t:'-\\sqrt{3}'},
  315:{s:'-1/\\sqrt{2}',c:'1/\\sqrt{2}',t:'-1'},
  330:{s:'-1/2',c:'\\sqrt{3}/2',t:'-1/\\sqrt{3}'},
  360:{s:'0',c:'1',t:'0'},
};
// ═══════════════════════════════════════════════════════════
// PREPROCESSOR
// ═══════════════════════════════════════════════════════════
export function preprocessProblem(text:string):string{
  let s=text;
  const sp:Record<string,string>={'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9'};
  s=s.replace(/([a-zA-Z0-9)])([²³⁴⁵⁶⁷⁸⁹⁰¹])/g,(_,b,x)=>`${b}^${sp[x]||x}`);
  let ch=true;while(ch){ch=false;for(const[u,a]of Object.entries(sp)){if(s.includes(u)){s=s.replace(u,a);ch=true}}}
  const sb:Record<string,string>={'₀':'0','₁':'1','₂':'2','₃':'3','₄':'4','₅':'5','₆':'6','₇':'7','₈':'8','₉':'9'};
  for(const[u,a]of Object.entries(sb))s=s.replace(new RegExp(u,'g'),`_${a}`);
  s=s.replace(/×/g,'*').replace(/÷/g,'/').replace(/−/g,'-').replace(/²/g,'^2').replace(/³/g,'^3');
  s=s.replace(/≠/g,'!=').replace(/≤/g,'<=').replace(/≥/g,'>=').replace(/≈/g,' approx ');
  s=s.replace(/θ/g,'theta').replace(/α/g,'alpha').replace(/β/g,'beta').replace(/γ/g,'gamma');
  s=s.replace(/δ/g,'delta').replace(/λ/g,'lambda').replace(/μ/g,'mu').replace(/σ/g,'sigma');
  s=s.replace(/ω/g,'omega').replace(/ρ/g,'rho').replace(/φ/g,'phi').replace(/π/g,'pi');
  s=s.replace(/∞/g,'infinity').replace(/±/g,' +/- ').replace(/·/g,'*');
  s=s.replace(/√/g,'sqrt(').replace(/∛/g,'cbrt(');
  s=s.replace(/∫/g,'integral of ').replace(/∑/g,'sum of ');
  s=s.replace(/↑/g,'(g)').replace(/↓/g,'(s)');
  s=s.replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"');
  s=s.replace(/[—–]/g,'-').replace(/…/g,'...');
  s=s.replace(/[​‌‍﻿­]/g,'');
  s=s.replace(/\s+/g,' ').trim();
  return s;
}
// ═══════════════════════════════════════════════════════════
// MATHEMATICS SOLVERS
// ═══════════════════════════════════════════════════════════

function solveLinearEq(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const t=text||_m[0];
  const eqM=t.match(/(.+?)\s*=\s*(.+)/);
  if(!eqM)return null;
  const lhs=eqM[1].trim(),rhs=eqM[2].trim();
  const rhsN=parseFloat(rhs);
  if(isNaN(rhsN))return null;
  const vM=lhs.match(/[xXyYzZ]/);
  if(!vM)return null;
  const v=vM[0];
  // Parse LHS: collect terms with var and without
  const terms=lhs.match(/-?\d*\.?\d*\s*[xXyYzZ]/g)||[];
  const consts=lhs.replace(/-?\d*\.?\d*\s*[xXyYzZ]/g,'').match(/-?\d+\.?\d*/g)||[];
  let coef=0;for(const tm of terms){const c=parseFloat(tm.replace(/\s*[xXyYzZ]\s*/,''))||0;coef+=c}
  if(terms.length>0&&coef===0)coef=1;
  let constant=0;for(const c of consts)constant+=parseFloat(c);
  if(constant===0&&terms.length>0){const clean=lhs.replace(/-?\d*\.?\d*\s*[xXyYzZ]\s*[+\-]?\s*/g,'').trim();if(clean&&!/[xXyYzZ]/.test(clean)){const parsed=parseFloat(clean);if(!isNaN(parsed))constant=parsed;}}
  if(coef===0)return null;
  const sol=(rhsN-constant)/coef;
  const solS=fmt(sol);
  return{
    finalAnswer:`${v} = ${solS}`,finalFormula:`${v} = ${solS}`,
    steps:[
      {desc:`Given equation: ${lhs} = ${rhs}`,formula:`${lhs} = ${rhs}`},
      {desc:constant!==0?`Move constant to RHS: ${coef===1?'':coef}${v} = ${rhsN} ${constant>0?'- '+constant:'+ '+Math.abs(constant)}`:`Isolate ${v}`,formula:`${coef===1?'':coef}${v} = ${rhsN - constant}`},
      {desc:`Divide by ${coef}`,formula:`${v} = ${rhsN - constant} / ${coef} = ${solS}`},
      {desc:`Verification: Substitute ${v}=${solS}`,formula:`${coef}(${solS}) ${constant>=0?'+':''}${constant} = ${coef*sol+constant} = ${rhsN} ✓`},
    ],
    altSteps:[],similar:[`Solve ${coef+1}${v} ${constant>=0?'+':''}${constant} = ${rhsN}`],
    mistakes:['Sign errors when moving terms','Dividing by wrong coefficient','Not isolating the variable completely'],
  };
}

function solveQuadratic(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const t=(text||_m[0]).toLowerCase();
  // Extract all numbers and the variable
  const vM=t.match(/[xXyYzZ]/);if(!vM)return null;const v=vM[0];
  const allN=N(t);
  // Try to find a,b,c: ax^2 + bx + c = 0
  // Handle "x^2 - 5x + 6 = 0", "x^2 = 16", "2x^2 + 3x - 5 = 0"
  let a=1,b=0,c=0;
  const isRHSOnly=t.match(/([xXyYzZ])\s*\^\s*2\s*=\s*(-?\d+\.?\d*)/);
  if(isRHSOnly){
    a=1;c=-(parseFloat(isRHSOnly[2])||0);
    // Check if there's a coefficient: "2x^2 = 18"
    const aM=t.match(/(-?\d*\.?\d*)\s*[xXyYzZ]\s*\^\s*2/);
    if(aM&&aM[1]){a=parseFloat(aM[1])||1;if(aM[1]==='-'||aM[1]==='-0')a=-0;}
  } else {
    // Standard form: ax^2 + bx + c = 0
    const nums=allN.filter(n=>isFinite(n));
    if(nums.length>=3){a=nums[0];b=nums[1];c=nums[2]}
    else if(nums.length===2){b=nums[0];c=nums[1]}
    else return null;
  }
  const disc=b*b-4*a*c;
  if(disc<0){const rp=fmt(-b/(2*a)),ip=fmt(Math.sqrt(-disc)/(2*a));
    return{finalAnswer:`${v} = ${rp} ± ${ip}i`,finalFormula:`${v} = ${rp} \\pm ${ip}i`,
    steps:[
      {desc:`a=${a}, b=${b}, c=${c}`,formula:`a=${a}, b=${b}, c=${c}`},
      {desc:`Discriminant D = b²-4ac = ${fmt(disc)} (negative)`,formula:`D = ${b}^2 - 4(${a})(${c}) = ${fmt(disc)}`},
      {desc:`Complex roots: ${v} = (-b ± i√|D|)/2a`,formula:`${v} = ${rp} \\pm ${ip}i`},
    ],altSteps:[],similar:[`Find roots of ${a}${v}^2 + ${b+1}${v} + ${c} = 0`],
    mistakes:['Wrong sign for discriminant','Not dividing by 2a']};
  }
  const sqD=Math.sqrt(disc);const x1=(-b+sqD)/(2*a),x2=(-b-sqD)/(2*a);
  return{
    finalAnswer:disc===0?`${v} = ${fmt(x1)}`:`${v} = ${fmt(x1)} or ${v} = ${fmt(x2)}`,
    finalFormula:disc===0?`${v} = \\frac{-b}{2a} = ${fmt(x1)}`:`${v} = \\frac{-b \\pm \\sqrt{D}}{2a}`,
    steps:[
      {desc:`a=${a}, b=${b}, c=${c}`,formula:`a=${a}, b=${b}, c=${c}`},
      {desc:`D = b²-4ac = ${b}² - 4(${a})(${c}) = ${fmt(disc)}`,
       formula:`D = ${fmt(disc)} ${disc>0?'(> 0, two real roots)':'(= 0, equal roots)'}`},
      {desc:`√D = ${fmt(sqD)}`,formula:`\\sqrt{D} = ${fmt(sqD)}`},
      {desc:`${v} = (-b ± √D) / 2a`,formula:`${v} = ${fmt(x1)}, ${fmt(x2)}`},
      {desc:`Verification: Sum = ${fmt(-b/a)}, Product = ${fmt(c/a)}`,formula:`\\alpha+\\beta = ${fmt(x1+x2)}, \\alpha\\beta = ${fmt(x1*x2)}`},
    ],
    altSteps:[{desc:`By factorization (if possible)`,formula:`a(${v}-r1)(${v}-r2) = 0`}],
    similar:[`Find sum & product of roots for a=${a},b=${b},c=${c}`],
    mistakes:['Wrong sign for b','Forgetting to divide by 2a','Arithmetic error in discriminant'],
  };
}

function solvePolyDifferentiate(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const t=text||_m[0];
  // Parse polynomial terms: ax^n, ax, constant
  const termRegex=/(-?\d*\.?\d*)\s*[xXyYzZ]\s*(?:\^\s*(-?\d+\.?\d*))?/g;
  const terms: {coef:number;exp:number}[] = [];
  let m:RegExpExecArray|null;
  while((m=termRegex.exec(t))!==null){
    const c=parseFloat(m[1])||(m[1]==='-'||m[1]==='-0'?-0:1);
    const e=parseFloat(m[2])||1;
    terms.push({coef:c,exp:e});
  }
  if(terms.length===0)return null;
  const vM=t.match(/[xXyYzZ]/);const v=vM?vM[0]:'x';
  // Parse constant terms (not matched above)
  const stripped=t.replace(termRegex.source,'');
  const constM=stripped.match(/-?\d+\.?\d*/);
  const constTerm=constM?parseFloat(constM[0]):0;
  let dTerms:string[]=[],dVals:string[]=[];
  for(const tm of terms){
    const nc=tm.coef*tm.exp,ne=tm.exp-1;
    const dStr=ne===0?`${fmt(nc)}`:ne===1?`${fmt(nc)}${v}`:`${fmt(nc)}${v}^${ne}`;
    dTerms.push(dStr);dVals.push(dStr);
  }
  const derivative=dTerms.join(' + ').replace(/\+ -/g,'- ');
  return{
    finalAnswer:`d/dx = ${derivative}${constTerm?` + 0`:""}`,
    finalFormula:`\\frac{d}{dx} = ${derivative}`,
    steps:[
      {desc:'Apply power rule: d/dx(ax^n) = nax^(n-1)',formula:'\\frac{d}{dx}(ax^n) = nax^{n-1}'},
      {desc:`Differentiate each term:`,formula:terms.map(tm=>`\\frac{d}{dx}(${tm.coef===1?'':tm.coef}${v}^${tm.exp}) = ${tm.exp}×${tm.coef}${v}^${tm.exp-1}`).join(', ')},
      {desc:`Result: ${derivative}`,formula:`= ${derivative}`},
    ],
    altSteps:[{desc:'Each term differentiated independently',formula:`${dVals.join(', ')}`}],
    similar:[`Integrate ${derivative}`,`Find second derivative of the original`],
    mistakes:['Wrong power rule application','Forgetting to multiply by coefficient','Wrong exponent after differentiation'],
  };
}

function solvePolyIntegrate(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const t=text||_m[0];
  const termRegex=/(-?\d*\.?\d*)\s*[xXyYzZ]\s*(?:\^\s*(-?\d+\.?\d*))?/g;
  const terms: {coef:number;exp:number}[] = [];
  let m:RegExpExecArray|null;
  while((m=termRegex.exec(t))!==null){
    const c=parseFloat(m[1])||(m[1]==='-'||m[1]==='-0'?-0:1);
    const e=parseFloat(m[2])||1;
    terms.push({coef:c,exp:e});
  }
  if(terms.length===0)return null;
  const vM=t.match(/[xXyYzZ]/);const v=vM?vM[0]:'x';
  let iTerms:string[]=[];
  for(const tm of terms){
    if(tm.exp===-1){iTerms.push(`${tm.coef}ln|${v}|`);continue}
    const ne=tm.exp+1,nc=tm.coef/ne;
    iTerms.push(`${fmt(nc)}${v}^${ne}`);
  }
  const integral=iTerms.join(' + ').replace(/\+ -/g,'- ') + ' + C';
  return{
    finalAnswer:`∫ = ${integral}`,
    finalFormula:`\\int = ${integral}`,
    steps:[
      {desc:'Apply power rule: ∫ax^n dx = ax^(n+1)/(n+1) + C',formula:'\\int ax^n dx = \\frac{a}{n+1}x^{n+1} + C'},
      {desc:`Integrate each term:`,formula:terms.map(tm=>{const ne=tm.exp+1;return`\\int ${tm.coef}${v}^${tm.exp} = \\frac{${tm.coef}}{${ne}}${v}^${ne}`}).join(', ')},
      {desc:`Result: ${integral}`,formula:`= ${integral}`},
    ],
    altSteps:[{desc:'Add constant of integration C',formula:'+ C'}],
    similar:[`Differentiate ${integral.replace(' + C','')}`,`Find definite integral from 0 to 1`],
    mistakes:['Forgetting +C','Wrong power rule (n+1 in denominator)','Not dividing coefficient'],
  };
}

function solveTrigStandardAngle(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const t=text||_m[0];
  const fnM=t.match(/(sin|cos|tan)\s*(\d+)\s*(?:degrees?|°)?/i);
  if(!fnM)return null;
  const fn=fnM[1].toLowerCase(),angle=parseInt(fnM[2]);
  const tv=TRIG[angle];if(!tv)return null;
  const val=fn==='sin'?tv.s:fn==='cos'?tv.c:tv.t;
  return{
    finalAnswer:`${fn} ${angle}° = ${val}`,
    finalFormula:`${fn} ${angle}° = ${val}`,
    steps:[
      {desc:`Standard angle: ${angle}°`,formula:`${fn} ${angle}°`},
      {desc:`From standard trigonometric values table`,formula:`${fn} ${angle}° = ${val}`},
    ],
    altSteps:[{desc:`Using unit circle: angle = ${angle}° from positive x-axis`,formula:`Reference angle = ${angle%180}°`}],
    similar:[`cos ${angle}°`,`tan ${angle}°`,`sin ${angle+30}°`],
    mistakes:['Confusing sin and cos values','Wrong quadrant sign','Using radians instead of degrees'],
  };
}

function solveTrigRatios(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const t=text||_m[0];
  const rM=t.match(/(sin|cos|tan)\s*(?:theta|\w+)\s*=\s*(\d+)\s*\/\s*(\d+)/i);
  if(!rM)return null;
  const given=rM[1].toLowerCase(),num=parseInt(rM[2]),den=parseInt(rM[3]);
  let opp=0,adj=0,hyp=den;
  if(given==='sin'){opp=num;hyp=den;adj=Math.sqrt(den*den-num*num)}
  else if(given==='cos'){adj=num;hyp=den;opp=Math.sqrt(den*den-num*num)}
  else if(given==='tan'){opp=num;adj=den;hyp=Math.sqrt(num*num+den*den)}
  const sinV=`${opp}/${hyp}`,cosV=`${adj}/${hyp}`,tanV=`${opp}/${adj}`;
  return{
    finalAnswer:`sin θ = ${sinV}, cos θ = ${cosV}, tan θ = ${tanV}`,
    finalFormula:`\\sin\\theta = \\frac{${opp}}{${hyp}}, \\cos\\theta = \\frac{${adj}}{${hyp}}, \\tan\\theta = \\frac{${opp}}{${adj}}`,
    steps:[
      {desc:`Given: ${given} θ = ${num}/${den}. Draw a right triangle.`,formula:`${given} θ = \\frac{${num}}{${den}}`},
      {desc:`Identify sides: hypotenuse = ${hyp}`,formula:`Hypotenuse = ${hyp}`},
      {desc:`By Pythagoras: other side = √(${hyp}² - ${num}²) = ${fmt(adj)}`,formula:`= \\sqrt{${hyp}^2 - ${num}^2} = ${fmt(adj)}`},
      {desc:`sin θ = opp/hyp = ${sinV}`,formula:`\\sin\\theta = ${sinV}`},
      {desc:`cos θ = adj/hyp = ${cosV}`,formula:`\\cos\\theta = ${cosV}`},
      {desc:`tan θ = opp/adj = ${tanV}`,formula:`\\tan\\theta = ${tanV}`},
    ],
    altSteps:[{desc:`Using identity: sin²θ + cos²θ = 1`,formula:`\\cos\\theta = \\sqrt{1 - (${num}/${den})^2} = ${adj}/${hyp}`}],
    similar:[`If sin θ = ${num+1}/${den}, find all ratios`,`If sec θ = ${den}/${adj}, find other ratios`],
    mistakes:['Wrong side identification','Not using Pythagoras correctly','Sign errors in quadrants other than first'],
  };
}

function solveLogarithm(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const t=text||_m[0];
  // Match: log 100, log2 8, log base 2 of 8, log 0.001, ln e^2
  const baseM=t.match(/(?:log|ln)\s*(?:base\s*)?(\d*\.?\d*)\s*(?:of\s+)?(\d+\.?\d*)/i);
  if(!baseM)return null;
  const isLn=/^ln/i.test(t.replace(/\s/g,''));
  let base=parseFloat(baseM[1])||10;
  const val=parseFloat(baseM[2]);
  if(isLn)base=Math.E;
  if(base<=0||base===1||val<=0)return null;
  const result=Math.log(val)/Math.log(base);
  const rStr=fmt(result);
  return{
    finalAnswer:`${isLn?'ln':'log_'+base} ${val} = ${rStr}`,
    finalFormula:`${isLn?'\\ln':'\\log_{'+base+'}'} ${val} = ${rStr}`,
    steps:[
      {desc:`Evaluate ${isLn?'ln':'log base '+base} of ${val}`,formula:`${isLn?'\\ln':'\\log_{'+base+'}'} ${val}`},
      {desc:`Using change of base: log_b(x) = ln(x)/ln(b)`,formula:`= \\frac{\\ln ${val}}{\\ln ${base}}`},
      {desc:`= ${rStr}`,formula:`= ${rStr}`},
    ],
    altSteps:[{desc:`Verify: ${base}^${rStr} = ${Math.pow(base,result).toFixed(4)} ≈ ${val}`,formula:`${base}^{${rStr}} ≈ ${val}`}],
    similar:[`log ${val*10} to base ${base}`,`ln ${Math.E*Math.E}`],
    mistakes:['Confusing log and ln','Wrong base','Not using change of base formula'],
  };
}

function solveGP(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const t=text||_m[0];const ns=pN(t);
  if(ns.length<2)return null;
  // Detect what's asked: nth term, sum, infinite sum
  const isSum=/sum/i.test(t),isInfinite=/infinite/i.test(t),isNth=/\d+(?:st|nd|rd|th)\s*term/i.test(t);
  // GP: a, ar, ar^2, ... need a, r, and either n or "sum"
  // Try: first 3 numbers given, or a, r, n given
  let a=ns[0],r=1,n=ns.length;
  if(ns.length>=3){a=ns[0];r=ns[1]/ns[0];n=ns[2]}
  else if(ns.length===2){a=ns[0];r=ns[1]/ns[0]}
  else return null;
  if(!isFinite(r)||r===0)return null;
  if(isNth||!isSum){
    const term=a*Math.pow(r,n-1);
    return{finalAnswer:`${n}${n===1?'st':n===2?'nd':n===3?'rd':'th'} term = ${fmt(term)}`,
    finalFormula:`a_n = ar^{n-1} = ${fmt(term)}`,
    steps:[
      {desc:`a = ${a}, r = ${fmt(r)}, n = ${n}`,formula:`a=${a}, r=${fmt(r)}, n=${n}`},
      {desc:`a_n = a × r^(n-1)`,formula:`a_{${n}} = ${a} \\times ${fmt(r)}^{${n-1}}`},
      {desc:`= ${fmt(term)}`,formula:`= ${fmt(term)}`},
    ],altSteps:[],similar:[`Sum of first ${n} terms of this GP`],
    mistakes:['Using n instead of n-1','Wrong common ratio','Off-by-one error']};
  }
  if(isInfinite&&Math.abs(r)<1){
    const s=a/(1-r);
    return{finalAnswer:`Sum to infinity = ${fmt(s)}`,
    finalFormula:`S_\\infty = \\frac{a}{1-r} = ${fmt(s)}`,
    steps:[
      {desc:`a = ${a}, r = ${fmt(r)}, |r| < 1 so infinite sum converges`,formula:`a=${a}, r=${fmt(r)}`},
      {desc:`S_∞ = a/(1-r)`,formula:`S_\\infty = \\frac{${a}}{1-${fmt(r)}}`},
      {desc:`= ${fmt(s)}`,formula:`= ${fmt(s)}`},
    ],altSteps:[],similar:[`7th term of this GP`],
    mistakes:['Not checking |r| < 1','Wrong formula','Subtraction error in denominator']};
  }
  const sn=r===1?a*n:a*(Math.pow(r,n)-1)/(r-1);
  return{finalAnswer:`Sum of ${n} terms = ${fmt(sn)}`,
  finalFormula:`S_n = \\frac{a(r^n - 1)}{r - 1} = ${fmt(sn)}`,
  steps:[
    {desc:`a = ${a}, r = ${fmt(r)}, n = ${n}`,formula:`a=${a}, r=${fmt(r)}, n=${n}`},
    {desc:`S_n = a(r^n - 1)/(r - 1)`,formula:`S_{${n}} = \\frac{${a}(${fmt(r)}^{${n}} - 1)}{${fmt(r)} - 1}`},
    {desc:`= ${fmt(sn)}`,formula:`= ${fmt(sn)}`},
  ],altSteps:[],similar:[`Sum to infinity (if |r|<1)`],
  mistakes:['Using n instead of r^n','Wrong formula for r<1 vs r>1','Not handling r=1 case']};
}

function solveAPSum(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const t=text||_m[0];const ns=pN(t);
  if(ns.length<3)return null;
  const n=ns[0],a=ns[1],d=ns[2];
  const sn=n/2*(2*a+(n-1)*d);
  return{finalAnswer:`Sum of ${n} terms = ${fmt(sn)}`,
  finalFormula:`S_n = \\frac{n}{2}(2a + (n-1)d) = ${fmt(sn)}`,
  steps:[
    {desc:`n = ${n}, a = ${a}, d = ${d}`,formula:`n=${n}, a=${a}, d=${d}`},
    {desc:`S_n = n/2 × (2a + (n-1)d)`,formula:`S_{${n}} = \\frac{${n}}{2}(2 \\times ${a} + (${n}-1) \\times ${d})`},
    {desc:`= ${n}/2 × (${2*a + (n-1)*d})`,formula:`= \\frac{${n}}{2} \\times ${2*a+(n-1)*d}`},
    {desc:`= ${fmt(sn)}`,formula:`= ${fmt(sn)}`},
  ],altSteps:[{desc:`S_n = n/2(a + a_n) where a_n = ${a+(n-1)*d}`,formula:`= ${n}/2(${a} + ${a+(n-1)*d}) = ${fmt(sn)}`}],
  similar:[`${n+5}th term of this AP`,`Sum of first ${n} terms if d=${d+1}`],
  mistakes:['Using n*d instead of (n-1)*d','Wrong formula','Off-by-one error']};
}

function solvePermutationCombination(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const t=text||_m[0];
  const pcrM=t.match(/(\d+)\s*(?:p|c|r)?\s*(\d+)/i);
  if(!pcrM)return null;
  const n=parseInt(pcrM[1]),r=parseInt(pcrM[2]);
  if(r>n||n>170)return null;
  const isP=/permut|\d+p\d|nP/i.test(t);
  const val=isP?fact(n)/fact(n-r):fact(n)/(fact(r)*fact(n-r));
  const lbl=isP?"P":"C";
  return{finalAnswer:lbl+"("+n+","+r+") = "+String(Math.round(val)),
  finalFormula:lbl+"("+n+","+r+") = "+String(Math.round(val)),
  steps:[
    {desc:"n="+n+", r="+r,formula:"n="+n},
    {desc:isP?"nPr = n!/(n-r)!":"nCr = n!/(r!(n-r)!)",formula:"n!/(n-r)!"},
    {desc:"= "+String(Math.round(val)),formula:"= "+String(Math.round(val))},
  ],altSteps:[],similar:[],mistakes:["Confusing P and C"]};
}

function solveDeterminant(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const t=text||_m[0];const ns=N(t);
  if(ns.length<4)return null;
  const a=ns[0],b=ns[1],c=ns[2],d=ns[3];
  const det=a*d-b*c;
  return{finalAnswer:`Determinant = ${det}`,
  finalFormula:`\\begin{vmatrix} ${a} & ${b} \\ ${c} & ${d} \\end{vmatrix} = ${det}`,
  steps:[
    {desc:`Matrix: [${a}  ${b}; ${c}  ${d}]`,formula:`\\begin{vmatrix} ${a} & ${b} \\ ${c} & ${d} \\end{vmatrix}`},
    {desc:`det = ad - bc`,formula:`= ${a} \\times ${d} - ${b} \\times ${c}`},
    {desc:`= ${a*d} - ${b*c} = ${det}`,formula:`= ${det}`},
  ],altSteps:[{desc:`If det ≠ 0, matrix is invertible`,formula:det!==0?'Matrix is non-singular':'Matrix is singular'}],
  similar:[`Inverse of this matrix`,`Determinant of 3×3 matrix`],
  mistakes:['Wrong multiplication order','Sign error in subtraction','Confusing rows and columns']};
}

function solveMidpoint(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const t=text||_m[0];const ns=N(t);
  if(ns.length<4)return null;
  const x1=ns[0],y1=ns[1],x2=ns[2],y2=ns[3];
  const mx=(x1+x2)/2,my=(y1+y2)/2;
  return{finalAnswer:`Midpoint = (${fmt(mx)}, ${fmt(my)})`,
  finalFormula:`M = (\\frac{${x1}+${x2}}{2}, \\frac{${y1}+${y2}}{2}) = (${fmt(mx)}, ${fmt(my)})`,
  steps:[
    {desc:`Points: (${x1}, ${y1}) and (${x2}, ${y2})`,formula:`A(${x1},${y1}), B(${x2},${y2})`},
    {desc:`Midpoint formula: M = ((x1+x2)/2, (y1+y2)/2)`,formula:`M = (\\frac{${x1}+${x2}}{2}, \\frac{${y1}+${y2}}{2})`},
    {desc:`= (${fmt(mx)}, ${fmt(my)})`,formula:`= (${fmt(mx)}, ${fmt(my)})`},
  ],altSteps:[],similar:[`Section formula dividing in ratio 2:1`],
  mistakes:['Wrong order of coordinates','Not dividing by 2','Sign errors']};
}

function solveSlopeFromPoints(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const t=text||_m[0];const ns=N(t);
  if(ns.length<4)return null;
  const x1=ns[0],y1=ns[1],x2=ns[2],y2=ns[3];
  if(x2===x1)return{finalAnswer:'Slope is undefined (vertical line)',finalFormula:'m = undefined',
    steps:[{desc:`x-coordinates are equal: x1 = x2 = ${x1}`,formula:'Vertical line'}],altSteps:[],similar:[],mistakes:[]};
  const m=(y2-y1)/(x2-x1);
  return{finalAnswer:`Slope = ${fmt(m)}`,finalFormula:`m = \\frac{${y2}-${y1}}{${x2}-${x1}} = ${fmt(m)}`,
  steps:[
    {desc:`Points: (${x1}, ${y1}) and (${x2}, ${y2})`,formula:`(${x1},${y1}), (${x2},${y2})`},
    {desc:`m = (y2-y1)/(x2-x1)`,formula:`m = \\frac{${y2}-${y1}}{${x2}-${x1}}`},
    {desc:`= ${fmt(m)}`,formula:`= ${fmt(m)}`},
  ],altSteps:[],similar:[`Equation of line through these points`,`Distance between them`],
  mistakes:['Swapping x and y','Wrong subtraction order','Division by zero']};
}

function solveStatsData(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const t=text||_m[0];
  // Extract all numbers from the data portion
  const dataM=t.match(/(?:of|:|:|are|is)\s*([\d,.\s]+)/i);
  const dataStr=dataM?dataM[1]:t.replace(/[^\d.,\s]/g,' ');
  const data=dataStr.match(/\d+\.?\d*/g)?.map(Number).filter(n=>isFinite(n))||[];
  if(data.length<2)return null;
  const sorted=[...data].sort((a,b)=>a-b);
  const sum=data.reduce((a,b)=>a+b,0);
  const mean=sum/data.length;
  const mid=Math.floor(sorted.length/2);
  const median=sorted.length%2===0?(sorted[mid-1]+sorted[mid])/2:sorted[mid];
  const freq:Record<string,number>={};
  let maxFreq=0,mode=sorted[0];
  for(const d of data){const k=String(d);freq[k]=(freq[k]||0)+1;if(freq[k]>maxFreq){maxFreq=freq[k];mode=d}}
  const variance=data.reduce((s,d)=>s+(d-mean)**2,0)/data.length;
  const sd=Math.sqrt(variance);
  const range=sorted[sorted.length-1]-sorted[0];
  return{finalAnswer:`Mean = ${fmt(mean)}, Median = ${fmt(median)}, Mode = ${mode}`,
  finalFormula:`\\bar{x} = ${fmt(mean)}, Median = ${fmt(median)}, Mode = ${mode}`,
  steps:[
    {desc:`Data (sorted): ${sorted.join(', ')}`,formula:`n = ${data.length}`},
    {desc:`Mean = Sum/n = ${sum}/${data.length} = ${fmt(mean)}`,formula:`\\bar{x} = \\frac{\\sum x_i}{n} = ${fmt(mean)}`},
    {desc:`Median: n=${data.length} is ${data.length%2===0?'even':'odd'}, middle = ${fmt(median)}`,formula:`M = ${fmt(median)}`},
    {desc:`Mode = most frequent = ${mode} (occurs ${maxFreq} times)`,formula:`Mode = ${mode}`},
    {desc:`Range = ${sorted[sorted.length-1]} - ${sorted[0]} = ${range}`,formula:`Range = ${range}`},
    {desc:`Standard Deviation = ${fmt(sd)}`,formula:`\sigma = ${fmt(sd)}`},
  ],altSteps:[],similar:[`Find variance of this data`,`If each value is increased by 5, find new mean`],
  mistakes:['Not sorting data before median','Wrong formula for grouped data','Missing multiple modes']};
}

function solveTimeWork(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const t=text||_m[0];const ns=pN(t);
  if(ns.length<2)return null;
  const a=ns[0],b=ns[1];
  const together=(a*b)/(a+b);
  return{finalAnswer:`Together they complete in ${fmt(together,2)} days`,
  finalFormula:`\\frac{ab}{a+b} = \\frac{${a} \\times ${b}}{${a}+${b}} = ${fmt(together,2)} days`,
  steps:[
    {desc:`A can do in ${a} days, B in ${b} days`,formula:`A: ${a} days, B: ${b} days`},
    {desc:`A's 1 day work = 1/${a}, B's 1 day work = 1/${b}`,formula:`\\frac{1}{${a}} + \\frac{1}{${b}}`},
    {desc:`Combined 1 day work = 1/${a} + 1/${b} = ${(a+b)}/${a*b}`,formula:`= \\frac{${a+b}}{${a*b}}`},
    {desc:`Time together = ${a*b}/(${a+b}) = ${fmt(together,2)} days`,formula:`= ${fmt(together,2)} days`},
  ],altSteps:[{desc:`In ${a*b} days: A does ${b} units, B does ${a} units, total ${a+b}`,formula:`Efficiency ratio = ${b}:${a}`}],
  similar:[`If C joins and takes ${b+5} days alone`],
  mistakes:['Adding days directly instead of using formula','Wrong LCM calculation','Not inverting for 1-day work']};
}

function solveBoatStream(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const t=text||_m[0];const ns=pN(t);
  if(ns.length<2)return null;
  const ds=ns[0],us=ns[1];
  const boat=(ds+us)/2,stream=(ds-us)/2;
  return{finalAnswer:`Boat speed = ${fmt(boat)} km/h, Stream speed = ${fmt(stream)} km/h`,
  finalFormula:`b = \\frac{${ds}+${us}}{2} = ${fmt(boat)}, s = \\frac{${ds}-${us}}{2} = ${fmt(stream)}`,
  steps:[
    {desc:`Downstream = ${ds} km/h, Upstream = ${us} km/h`,formula:`D = ${ds}, U = ${us}`},
    {desc:`Boat in still water = (D+U)/2`,formula:`b = \\frac{${ds}+${us}}{2} = ${fmt(boat)}`},
    {desc:`Stream speed = (D-U)/2`,formula:`s = \\frac{${ds}-${us}}{2} = ${fmt(stream)}`},
  ],altSteps:[],similar:[`Time to go ${ds*10}km downstream and back`],
  mistakes:['Confusing downstream and upstream','Wrong formula','Not converting units']};
}

function solvePercentage(_m:RegExpMatchArray):LocalSolution|null{
  const ns=N(_m[0]);if(ns.length<2)return null;
  const p=ns[0],v=ns[1],r=(p/100)*v;
  return{finalAnswer:`${p}% of ${v} = ${fmt(r)}`,finalFormula:`${p}\% \\times ${v} = ${fmt(r)}`,
  steps:[
    {desc:`Convert: ${p}% = ${p}/100`,formula:`${p}\% = \\frac{${p}}{100}`},
    {desc:`Multiply: (${p}/100) × ${v}`,formula:`\\frac{${p}}{100} \\times ${v}`},
    {desc:`= ${fmt(r)}`,formula:`= ${fmt(r)}`},
  ],altSteps:[{desc:`${v} × 0.${p} = ${fmt(r)}`,formula:`${v} \\times 0.${p} = ${fmt(r)}`}],
  similar:[`${p+10}% of ${v}`,`What % is ${fmt(r)} of ${v}?`],
  mistakes:['Dividing by 1000','Wrong decimal place','Confusing percentage and decimal']};
}

function solvePercentageReverse(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const ns=N(text||_m[0]);if(ns.length<2)return null;
  const part=ns[0],whole=ns[1],pct=(part/whole)*100;
  return{finalAnswer:`${part} is ${fmt(pct)}% of ${whole}`,finalFormula:`\\frac{${part}}{${whole}} \\times 100 = ${fmt(pct)}\%`,
  steps:[
    {desc:`Part = ${part}, Whole = ${whole}`,formula:`${part}, ${whole}`},
    {desc:`Percentage = (Part/Whole) × 100`,formula:`(${part}/${whole}) \\times 100`},
    {desc:`= ${fmt(pct)}%`,formula:`= ${fmt(pct)}%`},
  ],altSteps:[],similar:[`${part+20} is what % of ${whole}?`],
  mistakes:['Dividing whole by part','Forgetting × 100','Rounding too early']};
}

function solveSI(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const t=text||_m[0];const ns=pN(t);
  if(ns.length<3)return null;
  let p=ns[0],r=ns[1],tVal=ns[2];
  // Check for months/days
  const monthM=t.match(/(\d+\.?\d*)\s*months?/i);
  const dayM=t.match(/(\d+\.?\d*)\s*days?/i);
  if(monthM)tVal=parseFloat(monthM[1])/12;
  if(dayM)tVal=parseFloat(dayM[1])/365;
  const si=(p*r*tVal)/100,amt=p+si;
  return{finalAnswer:`SI = Rs ${fmt(si)}, Amount = Rs ${fmt(amt)}`,finalFormula:`SI = \\frac{P \\times R \\times T}{100} = Rs ${fmt(si)}`,
  steps:[
    {desc:`P = Rs ${p}, R = ${r}%, T = ${fmt(tVal,4)} years`,formula:`P=${p}, R=${r}\%, T=${fmt(tVal,4)}`},
    {desc:`SI = PRT/100`,formula:`SI = \\frac{${p} \\times ${r} \\times ${fmt(tVal,4)}}{100}`},
    {desc:`SI = Rs ${fmt(si)}, Amount = Rs ${fmt(amt)}`,formula:`A = P + SI = ${fmt(amt)}`},
  ],altSteps:[],similar:[`SI on Rs ${p+1000} at ${r}% for ${tVal} years`],
  mistakes:['Using CI formula','Wrong time unit (months vs years)','Not converting days to years']};
}

function solveCI(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const tx=text||_m[0];const ns=pN(tx);
  if(ns.length<3)return null;
  const p=ns[0],r=ns[1],time=ns[2];
  const isHalfYearly=/half\s*yearly/i.test(tx),isQuarterly=/quarterly/i.test(tx);
  const n=isHalfYearly?2:isQuarterly?4:1;
  const amt=p*Math.pow(1+r/(n*100),n*time);
  const ci=amt-p;
  const freq=isHalfYearly?'half-yearly':isQuarterly?'quarterly':'annually';
  return{finalAnswer:`Amount = Rs ${fmt(amt,2)}, CI = Rs ${fmt(ci,2)}`,finalFormula:`A = P(1+R/${n*100})^{${n}T} = Rs ${fmt(amt,2)}`,
  steps:[
    {desc:`P = Rs ${p}, R = ${r}%, T = ${time} years (${freq})`,formula:`P=${p}, R=${r}\%, T=${time}, n=${n}`},
    {desc:`A = P(1 + R/(n×100))^(nT)`,formula:`A = ${p}(1 + \\frac{${r}}{${n*100}})^{${n*time}}`},
    {desc:`= Rs ${fmt(amt,2)}`,formula:`= Rs ${fmt(amt,2)}`},
    {desc:`CI = A - P = Rs ${fmt(ci,2)}`,formula:`CI = ${fmt(ci,2)}`},
  ],altSteps:[{desc:`Using CI = P[(1+R/100)^T - 1]`,formula:`CI = ${p}[(1+${r}/100)^${time} - 1] = ${fmt(ci,2)}`}],
  similar:[`CI compounded ${isHalfYearly?'annually':'half-yearly'}`],
  mistakes:['Using SI formula','Wrong compounding frequency','Wrong time period']};
}

function solveProfitLoss(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const ns=N(text||_m[0]);if(ns.length<2)return null;
  const cp=ns[0],sp=ns[1],diff=sp-cp,isP=sp>cp;
  const pct=(Math.abs(diff)/cp*100).toFixed(2);
  return{finalAnswer:`${isP?'Profit':'Loss'} = ${Math.abs(diff)} (${pct}%)`,
  finalFormula:`${isP?'Profit':'Loss'} = SP - CP = ${Math.abs(diff)}`,
  steps:[
    {desc:`CP = ${cp}, SP = ${sp}`,formula:`CP = ${cp}, SP = ${sp}`},
    {desc:`${isP?'Profit':'Loss'} = SP - CP = ${sp} - ${cp} = ${diff}`,formula:`= ${diff}`},
    {desc:`Percentage = (${Math.abs(diff)}/${cp}) × 100 = ${pct}%`,formula:`= ${pct}\%`},
  ],altSteps:[],similar:[`Find SP if CP=${cp} and ${isP?'profit':'loss'}=20%`],
  mistakes:['Confusing CP and SP','Wrong percentage base','Sign errors']};
}

function solveDiscount(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const ns=N(text||_m[0]);if(ns.length<2)return null;
  const mp=ns[0],d=ns[1],da=(mp*d)/100,fp=mp-da;
  return{finalAnswer:`Discount = ${fmt(da,2)}, Final Price = ${fmt(fp,2)}`,finalFormula:`SP = MP(1-d/100) = ${fmt(fp,2)}`,
  steps:[
    {desc:`Marked Price = ${mp}, Discount = ${d}%`,formula:`MP=${mp}, d=${d}\%`},
    {desc:`Discount Amount = ${mp} × ${d}/100 = ${fmt(da,2)}`,formula:`DA = MP \\times d/100`},
    {desc:`Final Price = ${mp} - ${fmt(da,2)} = ${fmt(fp,2)}`,formula:`SP = MP - DA = ${fmt(fp,2)}`},
  ],altSteps:[],similar:[`MP=${mp+500}, discount=${d+5}%`],
  mistakes:['Calculating discount on SP instead of MP','Forgetting to subtract']};
}

function solveSpeed(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const ns=pN(text||_m[0]);if(ns.length<2)return null;
  const d=ns[0],t=ns[1],v=d/t,vMs=v*5/18;
  return{finalAnswer:`Speed = ${fmt(v)} km/h = ${fmt(vMs,2)} m/s`,finalFormula:`v = d/t = ${fmt(v)} km/h`,
  steps:[
    {desc:`Distance = ${d} km, Time = ${t} hours`,formula:`d=${d}km, t=${t}hr`},
    {desc:`Speed = Distance/Time`,formula:`v = ${d}/${t} = ${fmt(v)} km/h`},
    {desc:`Convert: × 5/18 = ${fmt(vMs,2)} m/s`,formula:`${fmt(v)} \\times 5/18 = ${fmt(vMs,2)} m/s`},
  ],altSteps:[],similar:[`Time for ${d+50}km at ${fmt(v)}km/h`],
  mistakes:['Wrong formula','Unit conversion errors','Mixed units']};
}

function solveAreaRect(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const ns=pN(text||_m[0]);if(ns.length<2)return null;
  const l=ns[0],b=ns[1],area=l*b,peri=2*(l+b);
  return{finalAnswer:`Area = ${area} sq. units, Perimeter = ${peri} units`,finalFormula:`A = l \\times b = ${area}`,
  steps:[
    {desc:`Length = ${l}, Breadth = ${b}`,formula:`l=${l}, b=${b}`},
    {desc:`Area = l × b = ${l} × ${b} = ${area}`,formula:`A = ${area}`},
    {desc:`Perimeter = 2(l+b) = ${peri}`,formula:`P = 2(${l}+${b}) = ${peri}`},
  ],altSteps:[],similar:[`Rectangle l=${l+5}, b=${b+3}`],
  mistakes:['Using perimeter formula for area','Wrong units']};
}

function solveAreaTriangle(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const ns=pN(text||_m[0]);if(ns.length<2)return null;
  const b=ns[0],h=ns[1],area=0.5*b*h;
  return{finalAnswer:`Area = ${area} sq. units`,finalFormula:`A = \\frac{1}{2}bh = ${area}`,
  steps:[
    {desc:`Base = ${b}, Height = ${h}`,formula:`b=${b}, h=${h}`},
    {desc:`Area = ½ × base × height`,formula:`A = \\frac{1}{2} \\times ${b} \\times ${h}`},
    {desc:`= ${area}`,formula:`= ${area}`},
  ],altSteps:[],similar:[`Triangle b=${b+3}, h=${h+2}`],
  mistakes:['Forgetting ½','Using base as height']};
}

function solveAreaCircle(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const ns=pN(text||_m[0]);if(ns.length<1)return null;
  const r=ns[0],area=Math.PI*r*r,circ=2*Math.PI*r;
  return{finalAnswer:`Area = ${fmt(area,2)} sq. units, Circumference = ${fmt(circ,2)}`,finalFormula:`A = \\pi r^2 = ${fmt(area,2)}`,
  steps:[
    {desc:`Radius = ${r}`,formula:`r=${r}`},
    {desc:`Area = πr²`,formula:`A = \\pi \\times ${r}^2 = ${fmt(area,2)}`},
    {desc:`Circumference = 2πr = ${fmt(circ,2)}`,formula:`C = 2\\pi${r} = ${fmt(circ,2)}`},
  ],altSteps:[],similar:[`Area of semicircle r=${r}`],
  mistakes:['Using diameter as radius','Confusing area and circumference']};
}

function solvePythagoras(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const ns=pN(text||_m[0]);if(ns.length<2)return null;
  const a=ns[0],b=ns[1],c=Math.sqrt(a*a+b*b);
  return{finalAnswer:`Hypotenuse = ${fmt(c,2)}`,finalFormula:`c = \\sqrt{a^2+b^2} = ${fmt(c,2)}`,
  steps:[
    {desc:`a = ${a}, b = ${b}`,formula:`a=${a}, b=${b}`},
    {desc:`c² = a² + b²`,formula:`c^2 = ${a}^2 + ${b}^2 = ${a*a+b*b}`},
    {desc:`c = √${a*a+b*b} = ${fmt(c,2)}`,formula:`c = ${fmt(c,2)}`},
  ],altSteps:[],similar:[`If a=${a+1}, find c`],
  mistakes:['Adding a+b instead of a²+b²','Not taking square root']};
}

function solveVolumeCylinder(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const ns=pN(text||_m[0]);if(ns.length<2)return null;
  const r=ns[0],h=ns[1],vol=Math.PI*r*r*h,csa=2*Math.PI*r*h,tsa=2*Math.PI*r*(r+h);
  return{finalAnswer:`Volume = ${fmt(vol,2)} cubic units`,finalFormula:`V = \\pi r^2 h = ${fmt(vol,2)}`,
  steps:[
    {desc:`Radius = ${r}, Height = ${h}`,formula:`r=${r}, h=${h}`},
    {desc:`Volume = πr²h = π×${r}²×${h}`,formula:`V = \\pi \\times ${r}^2 \\times ${h} = ${fmt(vol,2)}`},
    {desc:`CSA = 2πrh = ${fmt(csa,2)}`,formula:`CSA = ${fmt(csa,2)}`},
    {desc:`TSA = 2πr(r+h) = ${fmt(tsa,2)}`,formula:`TSA = ${fmt(tsa,2)}`},
  ],altSteps:[],similar:[`Volume of cone r=${r}, h=${h}`],
  mistakes:['Using r²h without π','Confusing CSA and TSA']};
}

function solveVolumeCone(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const ns=pN(text||_m[0]);if(ns.length<2)return null;
  const r=ns[0],h=ns[1],l=Math.sqrt(r*r+h*h),vol=Math.PI*r*r*h/3,csa=Math.PI*r*l,tsa=Math.PI*r*(r+l);
  return{finalAnswer:`Volume = ${fmt(vol,2)}, CSA = ${fmt(csa,2)}, TSA = ${fmt(tsa,2)}`,finalFormula:`V = \\frac{1}{3}\\pi r^2 h = ${fmt(vol,2)}`,
  steps:[
    {desc:`Radius = ${r}, Height = ${h}`,formula:`r=${r}, h=${h}`},
    {desc:`Slant height l = √(r²+h²) = ${fmt(l,2)}`,formula:`l = \\sqrt{${r}^2 + ${h}^2} = ${fmt(l,2)}`},
    {desc:`Volume = (1/3)πr²h = ${fmt(vol,2)}`,formula:`V = \\frac{1}{3} \\pi \\times ${r}^2 \\times ${h}`},
    {desc:`CSA = πrl = ${fmt(csa,2)}`,formula:`CSA = \\pi \\times ${r} \\times ${l}`},
    {desc:`TSA = πr(r+l) = ${fmt(tsa,2)}`,formula:`TSA = \\pi r(r+l) = ${fmt(tsa,2)}`},
  ],altSteps:[],similar:[`Volume of cylinder with same r and h`],
  mistakes:['Using 4/3 instead of 1/3','Confusing cone and cylinder','Not computing slant height']};
}

function solveVolumeSphere(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const ns=pN(text||_m[0]);if(ns.length<1)return null;
  const r=ns[0],vol=4/3*Math.PI*Math.pow(r,3),sa=4*Math.PI*r*r;
  return{finalAnswer:`Volume = ${fmt(vol,2)}, Surface Area = ${fmt(sa,2)}`,finalFormula:`V = \\frac{4}{3}\\pi r^3 = ${fmt(vol,2)}`,
  steps:[
    {desc:`Radius = ${r}`,formula:`r=${r}`},
    {desc:`V = (4/3)πr³`,formula:`V = \\frac{4}{3} \\pi ${r}^3 = ${fmt(vol,2)}`},
    {desc:`SA = 4πr² = ${fmt(sa,2)}`,formula:`SA = 4\\pi ${r}^2 = ${fmt(sa,2)}`},
  ],altSteps:[{desc:`Volume of hemisphere = (2/3)πr³ = ${fmt(vol/2,2)}`,formula:`V_{hemi} = \\frac{2}{3} \\pi r^3`}],
  similar:[`Volume of sphere r=${r+2}`],
  mistakes:['Using r² instead of r³','Confusing with cylinder']};
}

function solveVolumeHemisphere(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const ns=pN(text||_m[0]);if(ns.length<1)return null;
  const r=ns[0],vol=2/3*Math.PI*Math.pow(r,3),csa=2*Math.PI*r*r;
  return{finalAnswer:`Volume = ${fmt(vol,2)}, CSA = ${fmt(csa,2)}`,finalFormula:`V = \\frac{2}{3}\\pi r^3 = ${fmt(vol,2)}`,
  steps:[
    {desc:`Radius = ${r}`,formula:`r=${r}`},
    {desc:`Volume = (2/3)πr³`,formula:`V = \\frac{2}{3} \\pi ${r}^3 = ${fmt(vol,2)}`},
    {desc:`CSA = 2πr² = ${fmt(csa,2)}`,formula:`CSA = 2\\pi r^2 = ${fmt(csa,2)}`},
  ],altSteps:[],similar:[`Volume of full sphere r=${r}`],
  mistakes:['Using full sphere formula','Wrong coefficient']};
}

function solveVolumeCuboid(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const ns=pN(text||_m[0]);if(ns.length<3)return null;
  const l=ns[0],b=ns[1],h=ns[2],vol=l*b*h,tsa=2*(l*b+b*h+h*l),diag=Math.sqrt(l*l+b*b+h*h);
  return{finalAnswer:`Volume = ${vol}, TSA = ${tsa}, Diagonal = ${fmt(diag,2)}`,finalFormula:`V = lbh = ${vol}`,
  steps:[
    {desc:`l = ${l}, b = ${b}, h = ${h}`,formula:`l=${l}, b=${b}, h=${h}`},
    {desc:`Volume = l×b×h = ${vol}`,formula:`V = ${l} \\times ${b} \\times ${h} = ${vol}`},
    {desc:`TSA = 2(lb+bh+hl) = ${tsa}`,formula:`TSA = 2(${l*b}+${b*h}+${h*l}) = ${tsa}`},
    {desc:`Diagonal = √(l²+b²+h²) = ${fmt(diag,2)}`,formula:`d = \\sqrt{${l}^2+${b}^2+${h}^2} = ${fmt(diag,2)}`},
  ],altSteps:[],similar:[`Volume of cube with side ${l}`],
  mistakes:['Wrong formula','Missing a dimension']};
}

function solveAreaParallelogram(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const ns=pN(text||_m[0]);if(ns.length<2)return null;
  const b=ns[0],h=ns[1],area=b*h;
  return{finalAnswer:`Area = ${area} sq. units`,finalFormula:`A = base \\times height = ${area}`,
  steps:[{desc:`Base = ${b}, Height = ${h}`,formula:`b=${b}, h=${h}`},
    {desc:`Area = base × height = ${b} × ${h}`,formula:`A = ${b} \\times ${h} = ${area}`}],
  altSteps:[],similar:[`Area of rhombus with diagonals ${b} and ${h}`],
  mistakes:['Using wrong height','Confusing with rectangle']};
}

function solveAreaTrapezium(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const ns=pN(text||_m[0]);if(ns.length<3)return null;
  const a=ns[0],b=ns[1],h=ns[2],area=(a+b)/2*h;
  return{finalAnswer:`Area = ${area} sq. units`,finalFormula:`A = \\frac{a+b}{2} \\times h = ${area}`,
  steps:[{desc:`Parallel sides a=${a}, b=${b}, Height h=${h}`,formula:`a=${a}, b=${b}, h=${h}`},
    {desc:`Area = (a+b)/2 × h = (${a}+${b})/2 × ${h}`,formula:`A = \\frac{${a}+${b}}{2} \\times ${h} = ${area}`}],
  altSteps:[],similar:[`If h is doubled`],
  mistakes:['Not averaging parallel sides','Wrong sides selected']};
}

function solveLCMGCD(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const ns=pN(text||_m[0]);if(ns.length<2)return null;
  const gcd=(a:number,b:number):number=>b===0?a:gcd(b,a%b);
  let hcf=ns[0];for(let i=1;i<ns.length;i++)hcf=gcd(hcf,ns[i]);
  const lcm=(a:number,b:number):number=>(a*b)/gcd(a,b);
  let lcmV=ns[0];for(let i=1;i<ns.length;i++)lcmV=lcm(lcmV,ns[i]);
  return{finalAnswer:`LCM = ${lcmV}, GCD = ${hcf}`,finalFormula:`LCM=${lcmV}, GCD=${hcf}`,
  steps:[
    {desc:`Numbers: ${ns.join(', ')}`,formula:ns.join(', ')},
    {desc:`GCD (Euclidean algorithm)`,formula:`GCD = ${hcf}`},
    {desc:`LCM = product/GCD`,formula:`LCM = ${lcmV}`},
  ],altSteps:[],similar:[`LCM & GCD of ${ns.map(n=>n+10).join(', ')}`],
  mistakes:['Confusing LCM and GCD','Wrong prime factorization']};
}

function solveSquareCubeRoot(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const t=text||_m[0];const ns=pN(t);if(ns.length<1)return null;
  const n=ns[0];
  if(/square\s*root|sqrt/i.test(t)){const r=Math.sqrt(n);
    return{finalAnswer:`√${n} = ${fmt(r)}`,finalFormula:`\\sqrt{${n}} = ${fmt(r)}`,
    steps:[{desc:`Find √${n}`,formula:`\\sqrt{${n}}`},{desc:`√${n} = ${fmt(r)}`,formula:`= ${fmt(r)}`}],
    altSteps:[],similar:[`√${n*4}`],mistakes:['Rounding errors']};}
  if(/cube\s*root/i.test(t)){const r=Math.cbrt(n);
    return{finalAnswer:`∛${n} = ${fmt(r)}`,finalFormula:`\\sqrt[3]{${n}} = ${fmt(r)}`,
    steps:[{desc:`Find ∛${n}`,formula:`\\sqrt[3]{${n}}`},{desc:`∛${n} = ${fmt(r)}`,formula:`= ${fmt(r)}`}],
    altSteps:[],similar:[`√${n}`],mistakes:['Confusing cube and square root']};}
  return null;
}

// ═══════════════════════════════════════════════════════════
// PHYSICS SOLVERS
// ═══════════════════════════════════════════════════════════

function solveNewton(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const ns=N(text||_m[0]);if(ns.length<2)return null;
  const m=ns[0],f=ns[1],a=f/m;
  return{finalAnswer:`Acceleration = ${fmt(a,2)} m/s²`,finalFormula:`a = F/m = ${fmt(a,2)} m/s^2`,
  steps:[{desc:`Mass = ${m} kg, Force = ${f} N`,formula:`m=${m}kg, F=${f}N`},
    {desc:`F = ma → a = F/m`,formula:`a = ${f}/${m}`},
    {desc:`a = ${fmt(a,2)} m/s²`,formula:`a = ${fmt(a,2)} m/s^2`}],
  altSteps:[],similar:[`Find F if m=${m}kg, a=5m/s²`],
  mistakes:['Using a=m/F','Unit mismatch (g vs kg)']};
}

function solveForceMA(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const ns=N(text||_m[0]);if(ns.length<2)return null;
  const m=ns[0],a=ns[1],f=m*a;
  return{finalAnswer:`Force = ${f} N`,finalFormula:`F = ma = ${f} N`,
  steps:[{desc:`Mass = ${m} kg, Acceleration = ${a} m/s²`,formula:`m=${m}, a=${a}`},
    {desc:`F = ma = ${m}×${a} = ${f} N`,formula:`F = ma = ${f} N`}],
  altSteps:[],similar:[`F = ma for m=${m+2}kg`],mistakes:['Wrong units']};
}

function solveKineticEnergy(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const ns=N(text||_m[0]);if(ns.length<2)return null;
  const m=ns[0],v=ns[1],ke=0.5*m*v*v;
  return{finalAnswer:`KE = ${ke} J`,finalFormula:`KE = \\frac{1}{2}mv^2 = ${ke} J`,
  steps:[{desc:`Mass = ${m} kg, Velocity = ${v} m/s`,formula:`m=${m}, v=${v}`},
    {desc:`KE = ½mv² = ½×${m}×${v}² = ${ke} J`,formula:`KE = \\frac{1}{2} \\times ${m} \\times ${v}^2 = ${ke} J`}],
  altSteps:[{desc:`If v doubled: KE' = ½×${m}×${2*v}² = ${4*ke} J (4×!)`,formula:`KE \propto v^2`}],
  similar:[`PE = mgh for m=${m}kg, h=${v}m`],mistakes:['Forgetting ½','Not squaring v']};
}

function solveProjectile(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const t=text||_m[0];const ns=pN(t);if(ns.length<1)return null;
  const u=ns[0],gM=t.match(/g\s*=\s*(\d+)/);const g=gM?parseFloat(gM[1]):9.8;
  const h=(u*u)/(2*g),time=u/g;
  return{finalAnswer:`Max height = ${fmt(h,2)} m, Time = ${fmt(time,2)} s`,finalFormula:`H = \\frac{u^2}{2g} = ${fmt(h,2)} m`,
  steps:[{desc:`u = ${u} m/s, g = ${g} m/s²`,formula:`u=${u}, g=${g}`},
    {desc:`At max height v = 0, v² = u² - 2gh`,formula:`v = 0`},
    {desc:`h = u²/2g = ${u}²/(2×${g}) = ${fmt(h,2)} m`,formula:`H = \\frac{${u}^2}{2 \\times ${g}} = ${fmt(h,2)} m`},
    {desc:`Time = u/g = ${u}/${g} = ${fmt(time,2)} s`,formula:`t = u/g = ${fmt(time,2)} s`}],
  altSteps:[{desc:`Using energy: mgh = ½mv² → h = u²/2g`,formula:`Same result`}],
  similar:[`Total time of flight (up+down)`],mistakes:['Wrong sign convention','Using wrong g']};
}

function solveKinematic(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const ns=N(text||_m[0]);if(ns.length<3)return null;
  const u=ns[0],a=ns[1],t=ns[2];
  const s=u*t+0.5*a*t*t,v=u+a*t;
  return{finalAnswer:`Displacement = ${fmt(s,2)} m, Final velocity = ${fmt(v,2)} m/s`,finalFormula:`s = ut + \\frac{1}{2}at^2 = ${fmt(s,2)} m`,
  steps:[{desc:`u = ${u} m/s, a = ${a} m/s², t = ${t} s`,formula:`u=${u}, a=${a}, t=${t}`},
    {desc:`s = ut + ½at²`,formula:`s = ${u}×${t} + 0.5×${a}×${t}²`},
    {desc:`= ${fmt(s,2)} m`,formula:`= ${fmt(s,2)} m`},
    {desc:`v = u + at = ${u} + ${a}×${t} = ${fmt(v,2)} m/s`,formula:`v = ${fmt(v,2)} m/s`}],
  altSteps:[{desc:`Using v² = u² + 2as: v = √(${u}² + 2×${a}×${fmt(s,2)}) = ${fmt(v,2)} m/s`,formula:`v^2 = u^2 + 2as`}],
  similar:[`v² = u² + 2as for same values`],mistakes:['Wrong kinematic equation','Sign of acceleration']};
}

function solveKinematicV2(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const t=text||_m[0];const ns=N(t);if(ns.length<3)return null;
  const u=ns[0],v=ns[1],a=ns[2],s=(v*v-u*u)/(2*a);
  return{finalAnswer:`Displacement = ${fmt(s,2)} m`,finalFormula:`s = \\frac{v^2 - u^2}{2a} = ${fmt(s,2)} m`,
  steps:[{desc:`u = ${u}, v = ${v}, a = ${a}`,formula:`u=${u}, v=${v}, a=${a}`},
    {desc:`v² = u² + 2as → s = (v²-u²)/2a`,formula:`s = \\frac{${v}^2 - ${u}^2}{2 \\times ${a}}`},
    {desc:`s = ${fmt(s,2)} m`,formula:`= ${fmt(s,2)} m`}],
  altSteps:[],similar:[`Find t for same values`],mistakes:['Wrong rearrangement']};
}

function solveFreeFall(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const ns=pN(text||_m[0]);if(ns.length<1)return null;
  const h=ns[0],v=Math.sqrt(2*9.8*h),t=Math.sqrt(2*h/9.8);
  return{finalAnswer:`Velocity = ${fmt(v,2)} m/s, Time = ${fmt(t,2)} s`,finalFormula:`v = \\sqrt{2gh} = ${fmt(v,2)} m/s`,
  steps:[{desc:`Height h = ${h} m`,formula:`h=${h}`},
    {desc:`v² = 2gh → v = √(2×9.8×${h})`,formula:`v = \\sqrt{2 \\times 9.8 \\times ${h}}`},
    {desc:`v = ${fmt(v,2)} m/s`,formula:`= ${fmt(v,2)} m/s`},
    {desc:`t = √(2h/g) = ${fmt(t,2)} s`,formula:`t = ${fmt(t,2)} s`}],
  altSteps:[],similar:[`Drop from ${h+20}m`],mistakes:['Using v=gt without h']};
}

function solveWorkPower(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const ns=N(text||_m[0]);if(ns.length<3)return null;
  const m=ns[0],h=ns[1],t=ns[2],work=m*9.8*h,power=work/t;
  return{finalAnswer:`Power = ${fmt(power,2)} W`,finalFormula:`P = W/t = ${fmt(power,2)} W`,
  steps:[{desc:`Mass = ${m} kg, Height = ${h} m, Time = ${t} s`,formula:`m=${m}, h=${h}, t=${t}`},
    {desc:`W = mgh = ${m}×9.8×${h} = ${work} J`,formula:`W = mgh = ${work} J`},
    {desc:`P = W/t = ${work}/${t} = ${fmt(power,2)} W`,formula:`P = ${fmt(power,2)} W`}],
  altSteps:[],similar:[`Power if m=${m+10}kg`],mistakes:['Using g=10 vs 9.8','Not converting units']};
}

function solveMomentum(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const ns=N(text||_m[0]);if(ns.length<4)return null;
  const m1=ns[0],v1=ns[1],m2=ns[2],v2=ns[3],vf=(m1*v1+m2*v2)/(m1+m2);
  return{finalAnswer:`Final velocity = ${fmt(vf,2)} m/s`,finalFormula:`v_f = \\frac{m_1 v_1 + m_2 v_2}{m_1+m_2} = ${fmt(vf,2)}`,
  steps:[{desc:`m₁=${m1}kg, v₁=${v1}m/s, m₂=${m2}kg, v₂=${v2}m/s`,formula:`m_1=${m1}, v_1=${v1}, m_2=${m2}, v_2=${v2}`},
    {desc:`Conservation: m₁v₁ + m₂v₂ = (m₁+m₂)vf`,formula:`p_1 + p_2 = p_f`},
    {desc:`vf = (${m1}×${v1} + ${m2}×${v2}) / (${m1}+${m2})`,formula:`v_f = ${fmt(vf,2)} m/s`}],
  altSteps:[],similar:[`If m₂ doubled`],mistakes:['Wrong sign for velocities']};
}

function solveCircular(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const ns=N(text||_m[0]);if(ns.length<3)return null;
  const m=ns[0],r=ns[1],v=ns[2],fc=m*v*v/r;
  return{finalAnswer:`Centripetal Force = ${fmt(fc,2)} N`,finalFormula:`F_c = \\frac{mv^2}{r} = ${fmt(fc,2)} N`,
  steps:[{desc:`m=${m}kg, r=${r}m, v=${v}m/s`,formula:`m=${m}, r=${r}, v=${v}`},
    {desc:`Fc = mv²/r`,formula:`F_c = \\frac{${m} \\times ${v}^2}{${r}}`},
    {desc:`= ${fmt(fc,2)} N`,formula:`= ${fmt(fc,2)} N`}],
  altSteps:[],similar:[`Fc if v doubled = 4×Fc`],mistakes:['Using mv/r','Not squaring v']};
}

function solveOhm(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const ns=N(text||_m[0]);if(ns.length<2)return null;
  const v=ns[0],i=ns[1],r=v/i,p=v*i;
  return{finalAnswer:`R = ${fmt(r,2)} Ω, P = ${fmt(p,2)} W`,finalFormula:`R = V/I = ${fmt(r,2)} \Omega`,
  steps:[{desc:`V=${v}V, I=${i}A`,formula:`V=${v}, I=${i}`},
    {desc:`R = V/I = ${v}/${i} = ${fmt(r,2)} Ω`,formula:`R = ${fmt(r,2)} \Omega`},
    {desc:`P = VI = ${v}×${i} = ${fmt(p,2)} W`,formula:`P = ${fmt(p,2)} W`}],
  altSteps:[{desc:`P = I²R = ${i}²×${fmt(r,2)} = ${fmt(i*i*r,2)} W`,formula:`P = I^2R`}],
  similar:[`Find V if R=${fmt(r,0)}Ω, I=${i}A`],mistakes:['Using R=I/V']};
}

function solveSeriesParallel(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const t=text||_m[0];const ns=pN(t);if(ns.length<2)return null;
  const isParallel=/parallel/i.test(t);
  let result:number;
  if(isParallel){let inv=0;for(const r of ns)inv+=1/r;result=1/inv}
  else{result=ns.reduce((a,b)=>a+b,0)}
  return{finalAnswer:`Total R = ${fmt(result,4)} Ω (${isParallel?'parallel':'series'})`,finalFormula:`R = ${fmt(result,4)} \Omega`,
  steps:[{desc:`Resistors: ${ns.join(' Ω, ')} Ω in ${isParallel?'parallel':'series'}`,formula:ns.join(', ')},
    {desc:isParallel?`1/R = ${ns.map(r=>`1/${r}`).join(' + ')}`:`R = ${ns.join(' + ')}`,formula:isParallel?`1/R = ${ns.map(r=>`1/${r}`).join(' + ')}`:`R = ${ns.join(' + ')}`},
    {desc:`R = ${fmt(result,4)} Ω`,formula:`= ${fmt(result,4)} \Omega`}],
  altSteps:[],similar:[`Same resistors in ${isParallel?'series':'parallel'}`],
  mistakes:['Confusing series and parallel formulas']};
}

function solvePowerCircuit(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const ns=N(text||_m[0]);if(ns.length<2)return null;
  const v=ns[0],i=ns[1],p=v*i;
  return{finalAnswer:`Power = ${fmt(p,2)} W`,finalFormula:`P = VI = ${fmt(p,2)} W`,
  steps:[{desc:`V=${v}V, I=${i}A`,formula:`V=${v}, I=${i}`},
    {desc:`P = VI = ${v}×${i} = ${fmt(p,2)} W`,formula:`P = ${fmt(p,2)} W`}],
  altSteps:[{desc:`P = I²R: need R first`,formula:`P = I^2R`},{desc:`P = V²/R`,formula:`P = V^2/R`}],
  similar:[`Energy = Pt in kWh`],mistakes:['Using wrong formula']};
}

function solveGravitation(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const ns=N(text||_m[0]);if(ns.length<4)return null;
  const G=6.67e-11,m1=ns[0],m2=ns[1],r=ns[2];
  const scale=ns[3]||1;// typically 1 or extra param
  const F=G*m1*m2/(r*r*scale*scale);
  return{finalAnswer:`F = ${F.toExponential(4)} N`,finalFormula:`F = \\frac{Gm_1 m_2}{r^2} = ${F.toExponential(4)} N`,
  steps:[{desc:`m₁ = ${m1} kg, m₂ = ${m2} kg, r = ${r} m, G = 6.67×10⁻¹¹`,formula:`m_1=${m1}, m_2=${m2}, r=${r}`},
    {desc:`F = Gm₁m₂/r²`,formula:`F = \\frac{6.67 \\times 10^{-11} \\times ${m1} \\times ${m2}}{${r}^2}`},
    {desc:`= ${F.toExponential(4)} N`,formula:`= ${F.toExponential(4)} N`}],
  altSteps:[],similar:[`What if distance is doubled? (F/4)`],
  mistakes:['Wrong units for r (km vs m)','Not using scientific notation']};
}

function solveEscapeVelocity(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const ns=pN(text||_m[0]);
  const g=9.8,R=ns.length>0?ns[0]*1000:6.4e6;// assume km input
  const ve=Math.sqrt(2*g*R);
  return{finalAnswer:`Escape velocity = ${fmt(ve,2)} m/s = ${fmt(ve/1000,2)} km/s`,finalFormula:`v_e = \\sqrt{2gR} = ${fmt(ve/1000,2)} km/s`,
  steps:[{desc:`g = ${g} m/s², R = ${R} m`,formula:`g=${g}, R=${R}`},
    {desc:`ve = √(2gR)`,formula:`v_e = \\sqrt{2 \\times ${g} \\times ${R}}`},
    {desc:`= ${fmt(ve,2)} m/s`,formula:`= ${fmt(ve/1000,2)} km/s`}],
  altSteps:[],similar:[`Orbital velocity for same R`],mistakes:['R in km not m','Confusing with orbital velocity']};
}

function solveOrbitalVelocity(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const ns=pN(text||_m[0]);
  const g=9.8,R=ns.length>0?ns[0]*1000:6.4e6;
  const vo=Math.sqrt(g*R);
  return{finalAnswer:`Orbital velocity = ${fmt(vo,2)} m/s = ${fmt(vo/1000,2)} km/s`,finalFormula:`v_o = \\sqrt{gR} = ${fmt(vo/1000,2)} km/s`,
  steps:[{desc:`g = ${g}, R = ${R} m`,formula:`g=${g}, R=${R}`},
    {desc:`vo = √(gR)`,formula:`v_o = \\sqrt{gR}`},
    {desc:`= ${fmt(vo,2)} m/s`,formula:`= ${fmt(vo/1000,2)} km/s`}],
  altSteps:[],similar:[`Escape velocity`],mistakes:['Confusing with escape velocity']};
}

function solveLensFormula(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const ns=N(text||_m[0]);if(ns.length<2)return null;
  const f=ns[0],u=ns[1];// f and u given, find v
  const v=1/(1/f+1/u);// 1/v = 1/f + 1/u → v = 1/(1/f + 1/u)
  const m=v/u;
  return{finalAnswer:`Image distance v = ${fmt(v,2)} cm, Magnification m = ${fmt(m,2)}`,finalFormula:`\\frac{1}{v} - \\frac{1}{u} = \\frac{1}{f}`,
  steps:[{desc:`f = ${f} cm, u = ${u} cm (object distance)`,formula:`f=${f}, u=${u}`},
    {desc:`Lens formula: 1/v - 1/u = 1/f`,formula:`\\frac{1}{v} - \\frac{1}{${u}} = \\frac{1}{${f}}`},
    {desc:`1/v = 1/f + 1/u = ${fmt(1/f,6)} + ${fmt(1/u,6)}`,formula:`\\frac{1}{v} = ${fmt(1/f+1/u,6)}`},
    {desc:`v = ${fmt(v,2)} cm`,formula:`v = ${fmt(v,2)} cm`},
    {desc:`Magnification m = v/u = ${fmt(m,2)} (${m>0?'erect':'inverted'}, ${Math.abs(m)>1?'magnified':'diminished'})`,formula:`m = ${fmt(m,2)}`}],
  altSteps:[],similar:[`Mirror formula for same values`],mistakes:['Wrong sign convention','Confusing lens and mirror formulas']};
}

function solveMirrorFormula(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const ns=N(text||_m[0]);if(ns.length<2)return null;
  const f=ns[0],u=ns[1];
  const v=1/(1/f-1/u);// 1/v + 1/u = 1/f → v = 1/(1/f - 1/u)
  const m=-v/u;
  return{finalAnswer:`v = ${fmt(v,2)} cm, m = ${fmt(m,2)}`,finalFormula:`\\frac{1}{v} + \\frac{1}{u} = \\frac{1}{f}`,
  steps:[{desc:`f = ${f} cm, u = ${u} cm`,formula:`f=${f}, u=${u}`},
    {desc:`Mirror formula: 1/v + 1/u = 1/f`,formula:`\\frac{1}{v} + \\frac{1}{${u}} = \\frac{1}{${f}}`},
    {desc:`1/v = 1/f - 1/u = ${fmt(1/f-1/u,6)}`,formula:`\\frac{1}{v} = ${fmt(1/f-1/u,6)}`},
    {desc:`v = ${fmt(v,2)} cm, m = -v/u = ${fmt(m,2)}`,formula:`m = ${fmt(m,2)}`}],
  altSteps:[],similar:[`Lens formula for same values`],mistakes:['Wrong sign convention','Missing negative in magnification']};
}

function solveSnellsLaw(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const ns=pN(text||_m[0]);if(ns.length<4)return null;
  const n1=ns[0],t1=ns[1],n2=ns[2],t2=n1*Math.sin(t1*Math.PI/180)/n2;
  const angle2=Math.asin(t2)*180/Math.PI;
  return{finalAnswer:`sin θ₂ = ${fmt(t2,4)}, θ₂ = ${fmt(angle2,2)}°`,finalFormula:`n_1 \\sin\\theta_1 = n_2 \\sin\\theta_2`,
  steps:[{desc:`n₁=${n1}, θ₁=${t1}°, n₂=${n2}`,formula:`n_1=${n1}, \\theta_1=${t1}, n_2=${n2}`},
    {desc:`n₁sinθ₁ = n₂sinθ₂`,formula:`${n1} \\sin ${t1}° = ${n2} \\sin \\theta_2`},
    {desc:`sinθ₂ = (${n1}×sin${t1}°)/${n2} = ${fmt(t2,4)}`,formula:`\\sin\\theta_2 = ${fmt(t2,4)}`},
    {desc:`θ₂ = ${fmt(angle2,2)}°`,formula:`\\theta_2 = ${fmt(angle2,2)}°`}],
  altSteps:[],similar:[`If θ₁ > critical angle`],mistakes:['Not converting degrees to radians','Wrong ratio']};
}

function solveWaveSpeed(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const ns=N(text||_m[0]);if(ns.length<2)return null;
  const f=ns[0],lam=ns[1],v=f*lam;
  return{finalAnswer:`Wave speed = ${fmt(v,2)} m/s`,finalFormula:`v = f\\lambda = ${fmt(v,2)} m/s`,
  steps:[{desc:`Frequency = ${f} Hz, Wavelength = ${lam} m`,formula:`f=${f}, \\lambda=${lam}`},
    {desc:`v = fλ = ${f}×${lam}`,formula:`v = ${f} \\times ${lam} = ${fmt(v,2)} m/s`}],
  altSteps:[],similar:[`Find f if v=340m/s, λ=0.5m`],mistakes:['Unit mismatch (kHz vs Hz)']};
}

function solveSpecificHeat(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const ns=N(text||_m[0]);if(ns.length<3)return null;
  const m=ns[0],c=ns[1],dt=ns[2],Q=m*c*dt;
  return{finalAnswer:`Heat = ${fmt(Q,2)} J`,finalFormula:`Q = mc\Delta T = ${fmt(Q,2)} J`,
  steps:[{desc:`Mass = ${m} kg, Specific heat = ${c} J/kg·°C, ΔT = ${dt}°C`,formula:`m=${m}, c=${c}, \Delta T=${dt}`},
    {desc:`Q = mcΔT = ${m}×${c}×${dt}`,formula:`Q = ${m} \\times ${c} \\times ${dt} = ${fmt(Q,2)} J`}],
  altSteps:[],similar:[`Find ΔT if Q=${fmt(Q,0)}J`],mistakes:['Wrong units for specific heat','Not converting g to kg']};
}

function solveDensity(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const ns=N(text||_m[0]);if(ns.length<2)return null;
  const m=ns[0],V=ns[1],rho=m/V;
  return{finalAnswer:`Density = ${fmt(rho,4)} kg/m³`,finalFormula:`\rho = m/V = ${fmt(rho,4)} kg/m^3`,
  steps:[{desc:`Mass = ${m} kg, Volume = ${V} m³`,formula:`m=${m}, V=${V}`},
    {desc:`ρ = m/V`,formula:`\rho = ${m}/${V} = ${fmt(rho,4)} kg/m^3`}],
  altSteps:[],similar:[`Mass if ρ=${fmt(rho,0)} and V=${V}`],mistakes:['Volume in cm³ not m³']};
}

function solvePressure(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const ns=N(text||_m[0]);if(ns.length<2)return null;
  const F=ns[0],A=ns[1],P=F/A;
  return{finalAnswer:`Pressure = ${fmt(P,4)} Pa`,finalFormula:`P = F/A = ${fmt(P,4)} Pa`,
  steps:[{desc:`Force = ${F} N, Area = ${A} m²`,formula:`F=${F}, A=${A}`},
    {desc:`P = F/A = ${F}/${A}`,formula:`P = ${fmt(P,4)} Pa`}],
  altSteps:[{desc:`Hydrostatic pressure P = ρgh (if depth given)`,formula:`P = \rho g h`}],
  similar:[`P if area is halved`],mistakes:['Area in cm² not m²']};
}

function solveSimplePendulum(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const ns=pN(text||_m[0]);if(ns.length<1)return null;
  const l=ns[0],g=9.8,T=2*Math.PI*Math.sqrt(l/g);
  return{finalAnswer:`Time period = ${fmt(T,4)} s`,finalFormula:`T = 2\\pi\\sqrt{l/g} = ${fmt(T,4)} s`,
  steps:[{desc:`Length l = ${l} m, g = ${g} m/s²`,formula:`l=${l}, g=${g}`},
    {desc:`T = 2π√(l/g)`,formula:`T = 2\\pi\\sqrt{${l}/${g}}`},
    {desc:`T = ${fmt(T,4)} s`,formula:`= ${fmt(T,4)} s`}],
  altSteps:[{desc:`Frequency f = 1/T = ${fmt(1/T,4)} Hz`,formula:`f = 1/T = ${fmt(1/T,4)} Hz`}],
  similar:[`Find l for T=2s`],mistakes:['l in cm not m']};
}

function solveDeBroglie(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const ns=N(text||_m[0]);if(ns.length<2)return null;
  const m=ns[0],v=ns[1],h=6.626e-34,lam=h/(m*v);
  return{finalAnswer:`Wavelength = ${lam.toExponential(4)} m`,finalFormula:`\\lambda = h/mv = ${lam.toExponential(4)} m`,
  steps:[{desc:`m = ${m} kg, v = ${v} m/s, h = 6.626×10⁻³⁴ J·s`,formula:`m=${m}, v=${v}`},
    {desc:`λ = h/(mv)`,formula:`\\lambda = \\frac{6.626 \\times 10^{-34}}{${m} \\times ${v}}`},
    {desc:`= ${lam.toExponential(4)} m`,formula:`= ${lam.toExponential(4)} m`}],
  altSteps:[],similar:[`λ for electron with KE ${ns[0]}eV`],mistakes:['m in g not kg','v not in m/s']};
}

function solveCoulombLaw(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const ns=N(text||_m[0]);if(ns.length<3)return null;
  const k=9e9,q1=ns[0]*1e-6,q2=ns[1]*1e-6,r=ns[2];// assume μC
  const F=k*q1*q2/(r*r);
  return{finalAnswer:`F = ${F.toExponential(4)} N`,finalFormula:`F = \\frac{kq_1 q_2}{r^2}`,
  steps:[{desc:`q₁ = ${ns[0]} μC, q₂ = ${ns[1]} μC, r = ${r} m`,formula:`q_1=${ns[0]}\mu C, q_2=${ns[1]}\mu C, r=${r}`},
    {desc:`F = kq₁q₂/r²`,formula:`F = \\frac{9 \\times 10^9 \\times ${q1.toExponential(2)} \\times ${q2.toExponential(2)}}{${r}^2}`},
    {desc:`= ${F.toExponential(4)} N`,formula:`= ${F.toExponential(4)} N`}],
  altSteps:[],similar:[`F if r doubled (F/4)`],mistakes:['Wrong charge units','r in cm not m']};
}

// ═══════════════════════════════════════════════════════════
// CHEMISTRY SOLVERS
// ═══════════════════════════════════════════════════════════

function solvePH(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const t=text||_m[0];const ns=pN(t);if(ns.length<1)return null;
  const conc=ns[0];const ph=-Math.log10(conc);
  const isBase=/naoh|koh|ca\(oh\)2|nh3|base|alkali/i.test(t);
  if(isBase){
    const nFactor=/ca\(oh\)2/i.test(t)?2:1;
    const ohConc=conc*nFactor;
    const poh=-Math.log10(ohConc);const phVal=14-poh;
    return{finalAnswer:`pH = ${fmt(phVal,2)} (basic)`,finalFormula:`pH = 14 - pOH = ${fmt(phVal,2)}`,
    steps:[{desc:`[OH⁻] = ${conc} × ${nFactor} = ${ohConc} M`,formula:`[OH^-] = ${ohConc}`},
      {desc:`pOH = -log[OH⁻] = ${fmt(poh,2)}`,formula:`pOH = -\log(${ohConc}) = ${fmt(poh,2)}`},
      {desc:`pH = 14 - pOH = ${fmt(phVal,2)}`,formula:`pH = 14 - ${fmt(poh,2)} = ${fmt(phVal,2)}`}],
    altSteps:[],similar:[`pH of ${conc/10}M NaOH`],mistakes:['Not multiplying by n-factor for Ca(OH)₂']};}
  return{finalAnswer:`pH = ${fmt(ph,2)} (${ph<7?'acidic':ph===7?'neutral':'basic'})`,finalFormula:`pH = -\log[${conc}] = ${fmt(ph,2)}`,
  steps:[{desc:`[H⁺] = ${conc} M`,formula:`[H^+] = ${conc}`},
    {desc:`pH = -log[H⁺] = -log(${conc})`,formula:`pH = -\log(${conc})`},
    {desc:`pH = ${fmt(ph,2)}`,formula:`= ${fmt(ph,2)}`}],
  altSteps:[],similar:[`pH of ${conc*10}M HCl`],mistakes:['Using log instead of -log','Confusing [H⁺] and [OH⁻]']};
}

function solveMolarityGeneral(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const t=text||_m[0];const ns=pN(t);if(ns.length<2)return null;
  const mass=ns[0],vol=ns[1]/1000;// mL to L
  // Try to find compound formula
  const fM=t.match(/([A-Z][a-z]?(?:\([A-Za-z0-9]+\))?\d*)/g);
  let compound='NaOH',molarMass=40;
  if(fM){for(const f of fM){const mm=mMol(f);if(mm&&mm>10&&mm<500){compound=f;molarMass=mm;break}}}
  const moles=mass/molarMass,molarity=moles/vol;
  return{finalAnswer:`Molarity = ${fmt(molarity,4)} M`,finalFormula:`M = n/V = ${fmt(molarity,4)} M`,
  steps:[{desc:`Mass = ${mass}g ${compound}, Volume = ${vol}L`,formula:`m=${mass}g, V=${vol}L`},
    {desc:`Molar mass of ${compound} = ${molarMass} g/mol`,formula:`M_{mol} = ${molarMass}`},
    {desc:`Moles = mass/MM = ${mass}/${molarMass} = ${fmt(moles,4)}`,formula:`n = ${fmt(moles,4)} mol`},
    {desc:`Molarity = n/V = ${fmt(molarity,4)} M`,formula:`M = ${fmt(molarity,4)} M`}],
  altSteps:[],similar:[`Molarity of ${mass*2}g ${compound} in ${ns[1]}mL`],
  mistakes:['Not converting mL to L','Wrong molar mass']};
}

function solveMolality(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const ns=N(text||_m[0]);if(ns.length<3)return null;
  const mass=ns[0],mm=ns[1],solventKg=ns[2]/1000;
  const moles=mass/mm,molality=moles/solventKg;
  return{finalAnswer:`Molality = ${fmt(molality,4)} m`,finalFormula:`m = n_{solute}/m_{solvent} = ${fmt(molality,4)} m`,
  steps:[{desc:`Solute mass = ${mass}g, Molar mass = ${mm}g/mol`,formula:`m_{solute}=${mass}g, MM=${mm}`},
    {desc:`Moles = ${mass}/${mm} = ${fmt(moles,4)}`,formula:`n = ${fmt(moles,4)}`},
    {desc:`Solvent = ${solventKg} kg`,formula:`m_{solvent}=${solventKg}kg`},
    {desc:`Molality = ${fmt(molality,4)} m`,formula:`m = ${fmt(molality,4)} m`}],
  altSteps:[],similar:[`Molarity if density given`],mistakes:['g solvent vs kg solvent']};
}

function solveDilution(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const ns=N(text||_m[0]);if(ns.length<4)return null;
  const m1=ns[0],v1=ns[1],m2=ns[2],v2=(m1*v1)/m2;
  return{finalAnswer:`V₂ = ${fmt(v2,2)} mL`,finalFormula:`M_1V_1 = M_2V_2`,
  steps:[{desc:`M₁=${m1}, V₁=${v1}, M₂=${m2}`,formula:`M_1=${m1}, V_1=${v1}, M_2=${m2}`},
    {desc:`M₁V₁ = M₂V₂`,formula:`${m1} \\times ${v1} = ${m2} \\times V_2`},
    {desc:`V₂ = ${m1*v1}/${m2} = ${fmt(v2,2)} mL`,formula:`V_2 = ${fmt(v2,2)} mL`}],
  altSteps:[],similar:[`Find M₂ if V₂ given`],mistakes:['Volume unit mismatch']};
}

function solveIdealGas(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const ns=N(text||_m[0]);if(ns.length<3)return null;
  const P=ns[0],V=ns[1],T=ns[2],R=0.0821;
  const n=(P*V)/(R*T);
  return{finalAnswer:`n = ${fmt(n,4)} mol`,finalFormula:`n = PV/RT = ${fmt(n,4)} mol`,
  steps:[{desc:`P=${P}atm, V=${V}L, T=${T}K, R=0.0821 L·atm/(mol·K)`,formula:`P=${P}, V=${V}, T=${T}`},
    {desc:`PV = nRT → n = PV/RT`,formula:`n = \\frac{PV}{RT}`},
    {desc:`n = (${P}×${V})/(0.0821×${T}) = ${fmt(n,4)} mol`,formula:`= ${fmt(n,4)} mol`}],
  altSteps:[{desc:`Find V: V = nRT/P`,formula:`V = nRT/P`}],
  similar:[`Find P if n and V given`],mistakes:['T not in Kelvin','Wrong R value']};
}

function solveMolesGeneral(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const t=text||_m[0];const ns=pN(t);if(ns.length<1)return null;
  const mass=ns[0];
  const fM=t.match(/([A-Z][a-z]?(?:\([A-Za-z0-9]+\))?\d*)/g);
  let compound='NaOH',mm=40;
  if(fM){for(const f of fM){const m=mMol(f);if(m&&m>10&&m<500){compound=f;mm=m;break}}}
  const moles=mass/mm;
  return{finalAnswer:`Moles = ${fmt(moles,4)}`,finalFormula:`n = m/M = ${fmt(moles,4)}`,
  steps:[{desc:`Mass = ${mass}g, Molar mass of ${compound} = ${mm} g/mol`,formula:`m=${mass}, M=${mm}`},
    {desc:`n = mass/molar mass = ${mass}/${mm}`,formula:`n = ${fmt(moles,4)} mol`}],
  altSteps:[],similar:[`Mass of ${fmt(moles+1,2)} moles`],mistakes:['Wrong molar mass']};
}

function solveMassFromMoles(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const t=text||_m[0];const ns=pN(t);if(ns.length<1)return null;
  const moles=ns[0];
  const fM=t.match(/([A-Z][a-z]?(?:\([A-Za-z0-9]+\))?\d*)/g);
  let compound='NaOH',mm=40;
  if(fM){for(const f of fM){const m=mMol(f);if(m&&m>10&&m<500){compound=f;mm=m;break}}}
  const mass=moles*mm;
  return{finalAnswer:`Mass = ${fmt(mass,2)} g`,finalFormula:`m = n × M = ${fmt(mass,2)} g`,
  steps:[{desc:`Moles = ${moles}, Molar mass of ${compound} = ${mm}`,formula:`n=${moles}, M=${mm}`},
    {desc:`mass = n × M = ${moles} × ${mm}`,formula:`m = ${moles} \\times ${mm} = ${fmt(mass,2)} g`}],
  altSteps:[],similar:[`Moles in ${mass+40}g`],mistakes:['Confusing mass and moles']};
}

function solveMolarMass(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const t=text||_m[0];
  const fM=t.match(/([A-Z][a-z]?(?:\([A-Za-z0-9]+\))?\d*)/g);
  if(!fM)return null;
  for(const f of fM){
    const mm=mMol(f);if(!mm||mm<10||mm>500)continue;
    const els=parseFormula(f);
    const parts=els.map(e=>`${e.element}${e.count>1?e.count:''} = ${e.count*AM[e.element]||'?'}`);
    return{finalAnswer:`Molar Mass = ${mm} g/mol`,finalFormula:`M = ${mm} g/mol`,
    steps:[{desc:`Elements: ${els.map(e=>e.element+(e.count>1?e.count:'')).join(', ')}`,formula:parts.join(' + ')},
      {desc:`Add atomic masses`,formula:parts.join(' + ')},
      {desc:`Total = ${mm} g/mol`,formula:`= ${mm} g/mol`}],
    altSteps:[],similar:[`Mass of 2 moles`],mistakes:['Missing subscript atoms','Wrong atomic masses']};
  }
  return null;
}

function solveElectronConfig(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const t=text||_m[0];const ns=pN(t);if(ns.length<1)return null;
  const Z=ns[0];
  if(Z>36||Z<1)return null;
  const config:string[]=[];
  const order=[[1,'s'],[2,'s'],[2,'p'],[3,'s'],[3,'p'],[4,'s'],[3,'d'],[4,'p'],[4,'d'],[5,'s']];
  const maxE:Record<string,number>={s:2,p:6,d:10};
  let rem=Z;
  for(const[n,l]of order){if(rem<=0)break;
    const e=Math.min(rem,maxE[l]);
    config.push(`${n}${l}${e>1?e:''}`);rem-=e;
  }
  return{finalAnswer:config.join(' '),finalFormula:config.join(' '),
  steps:[{desc:`Atomic number Z = ${Z}`,formula:`Z=${Z}`},
    {desc:`Fill orbitals: 1s→2s→2p→3s→3p→4s→3d→4p`,formula:`Aufbau principle`},
    {desc:`Configuration: ${config.join(' ')}`,formula:config.join(' ')}],
  altSteps:[{desc:`Noble gas shorthand available for Z≥${Z>10?'11':'1'}`,formula:`[Ne] 3s²...`}],
  similar:[`Electron config of element ${Z+1}`],mistakes:['Wrong orbital order (4s before 3d)','Exceeding orbital capacity']};
}

function solveReaction(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const ns=N(text||_m[0]);if(ns.length<3)return null;
  const v1=ns[0],m1=ns[1],v2=ns[2];
  const m2=(v1*m1)/v2;
  return{finalAnswer:`M₂ = ${fmt(m2,4)} M`,finalFormula:`M_2 = \\frac{M_1 V_1}{V_2} = ${fmt(m2,4)} M`,
  steps:[{desc:`M₁V₁ = M₂V₂ (titration)`,formula:`M_1=${m1}, V_1=${v1}, V_2=${v2}`},
    {desc:`M₂ = (M₁V₁)/V₂ = (${m1}×${v1})/${v2}`,formula:`M_2 = ${fmt(m2,4)} M`}],
  altSteps:[],similar:[`Find volume`],mistakes:['Volume unit mismatch','Wrong stoichiometric ratio']};
}

function solveEvaluateExpr(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const t=(text||_m[0]).trim();
  const exprM=t.match(/(?:calculate|evaluate|compute|what is|find the value of|solve)\s+(.+)/i);
  let expr=exprM?exprM[1].trim():t.replace(/^(calculate|evaluate|compute|what is|find the value of|solve)\s*/i,'').trim();
  expr=expr.replace(/[?!.,]+$/,'').replace(/×/g,'*').replace(/÷/g,'/').replace(/\^/g,'**').replace(/\bpi\b/gi,'Math.PI').replace(/²/g,'**2').replace(/³/g,'**3');
  // Allow digits, operators, parens, dots, math function names, Math.*
  if(!/^[\d\s+\-*/().%eEPIsincotalgqrtbMC,.]+$/i.test(expr))return null;
  try{
    const reps=[['sqrt(','Math.sqrt('],['cbrt(','Math.cbrt('],['sin(','Math.sin('],['cos(','Math.cos('],['tan(','Math.tan('],['log(','Math.log10('],['ln(','Math.log('],['abs(','Math.abs(']];
    let ev=expr;for(const[from,to]of reps){ev=ev.split(from).join(to)}
    const result=new Function('"use strict";return('+ev+')')();
    if(typeof result!=='number'||!isFinite(result))return null;
    const rounded=Math.round(result*10000)/10000;
    return{finalAnswer:'= '+rounded,finalFormula:'= '+rounded,
    steps:[{desc:'Expression: '+expr,formula:expr},{desc:'Result',formula:'= '+rounded}],
    altSteps:[],similar:[],mistakes:['BODMAS error']};
  }catch{return null}
}

function solveGasLaw(_m:RegExpMatchArray,text?:string):LocalSolution|null{
  const ns=N(text||_m[0]);if(ns.length<4)return null;
  const p1=ns[0],v1=ns[1],p2=ns[2],t2=ns[3],t1=273;
  const v2=(p1*v1*t2)/(p2*t1);
  return{finalAnswer:`V₂ = ${fmt(v2,2)} L`,finalFormula:`V_2 = \\frac{P_1 V_1 T_2}{P_2 T_1} = ${fmt(v2,2)} L`,
  steps:[{desc:`P₁=${p1}atm, V₁=${v1}L, T₁=${t1}K, P₂=${p2}atm, T₂=${t2}K`,formula:`P_1=${p1}, V_1=${v1}, T_1=${t1}K`},
    {desc:'Combined gas law: P₁V₁/T₁ = P₂V₂/T₂',formula:'\\frac{P_1 V_1}{T_1} = \\frac{P_2 V_2}{T_2}'},
    {desc:`V₂ = (P₁V₁T₂)/(P₂T₁)`,formula:`V_2 = ${fmt(v2,2)} L`}],
  altSteps:[],similar:[`Find P₂`],mistakes:['Not converting °C to K','Mixing up initial/final']};
}

// ═══════════════════════════════════════════════════════════
// PATTERN MATCHING & MAIN ENTRY
// ═══════════════════════════════════════════════════════════

interface PatternRule{regex:RegExp;solver:(m:RegExpMatchArray,fullText?:string)=>LocalSolution|null;useFullText?:boolean}

const PATTERNS:PatternRule[]=[
  // ── MATH: Specific patterns first ──
  {regex:/\d*\.?\d*\s*[xXyYzZ]\s*[+\-]\s*\d+\.?\d*\s*(?:[+\-]\s*\d+\.?\d*\s*)?=\s*-?\d+\.?\d*/i,solver:solveLinearEq},
  {regex:/(?:solve|find)\s+[\d.]*\s*[xXyYzZ]\s*[+\-]\s*\d+\s*=\s*\d+/i,solver:solveLinearEq},
  {regex:/(?:solve|find).*?roots?/i,solver:solveQuadratic,useFullText:true},
  {regex:/-?\d*\.?\d*\s*[xXyYzZ]\s*[\^²]\s*2\s*[+\-]\s*\d+\.?\d*\s*[xXyYzZ]?\s*[+\-]\s*-?\d+\.?\d*\s*=\s*0/i,solver:solveQuadratic,useFullText:true},
  {regex:/[xXyYzZ]\s*[\^²]\s*2\s*=\s*-?\d+/i,solver:solveQuadratic,useFullText:true},
  {regex:/differentiate|d\/dx|derivative/i,solver:solvePolyDifferentiate,useFullText:true},
  {regex:/integrate|\\int|integral/i,solver:solvePolyIntegrate,useFullText:true},
  {regex:/(?:sin|cos|tan)\s+(\d+)\s*(?:degrees?|°)/i,solver:solveTrigStandardAngle},
  {regex:/(?:sin|cos|tan)\s*(?:theta|\\w+)\s*=\s*(\d+)\s*\/\s*(\d+)/i,solver:solveTrigRatios,useFullText:true},
  {regex:/(?:log|ln)\s*(?:base\s*)?\d*\.?\d*\s*(?:of\s+)?\d+\.?\d*/i,solver:solveLogarithm,useFullText:true},
  {regex:/(?:GP|geometric\s*(?:progression|series))/i,solver:solveGP,useFullText:true},
  {regex:/sum\s+(?:of|for)\s*\d+.*AP|AP.*sum/i,solver:solveAPSum,useFullText:true},
  {regex:/\d+[pPcC]\d+|permut|combin|\^\{?\d+[pPcC]\d+/i,solver:solvePermutationCombination,useFullText:true},
  {regex:/determinant|det\s*(?:of|\()/i,solver:solveDeterminant,useFullText:true},
  {regex:/midpoint|mid-point/i,solver:solveMidpoint,useFullText:true},
  {regex:/slope|gradient.*?\(\d/i,solver:solveSlopeFromPoints,useFullText:true},
  {regex:/mean.*?median.*?mode\s+of|standard\s*deviation|variance\s+of/i,solver:solveStatsData,useFullText:true},
  {regex:/(?:can|complete).*\d+\s*days?.*\d+\s*days?.*together|time.*?work.*?together/i,solver:solveTimeWork,useFullText:true},
  {regex:/boat|stream|downstream|upstream|still\s*water/i,solver:solveBoatStream,useFullText:true},
  {regex:/(?:cost\s*price|cp).*selling\s*price|profit|loss.*?percent/i,solver:solveProfitLoss,useFullText:true},
  {regex:/discount.*?%\s*(?:on|of)|marked\s*price.*discount/i,solver:solveDiscount,useFullText:true},
  {regex:/simple\s+interest/i,solver:solveSI,useFullText:true},
  {regex:/compound\s+interest/i,solver:solveCI,useFullText:true},
  {regex:/(\d+\.?\d*)%\s*of\s+(\d+\.?\d*)/i,solver:solvePercentage},
  {regex:/is\s+what\s+percent.*?of/i,solver:solvePercentageReverse,useFullText:true},
  {regex:/(?:average\s+)?speed.*?(\d+)\s*km.*?(\d+)\s*(?:hours?|hr)/i,solver:solveSpeed,useFullText:true},
  {regex:/travels\s+(\d+)\s*km\s+in\s+(\d+)\s*hours/i,solver:solveSpeed},
  {regex:/area.*?rectangle|perimeter.*?rectangle|length.*?breadth/i,solver:solveAreaRect,useFullText:true},
  {regex:/area.*?triangle|base.*?height.*?triangle/i,solver:solveAreaTriangle,useFullText:true},
  {regex:/area.*?circle|circumference.*?circle|radius.*?circle/i,solver:solveAreaCircle,useFullText:true},
  {regex:/ladder.*?(\d+).*?(\d+).*?wall|hypotenuse|pythagoras/i,solver:solvePythagoras,useFullText:true},
  {regex:/volume.*?cylinder|CSA.*?cylinder|TSA.*?cylinder/i,solver:solveVolumeCylinder,useFullText:true},
  {regex:/volume.*?cone|CSA.*?cone|TSA.*?cone|slant\s*height/i,solver:solveVolumeCone,useFullText:true},
  {regex:/volume.*?sphere|surface.*?sphere/i,solver:solveVolumeSphere,useFullText:true},
  {regex:/volume.*?hemisphere|hemisphere.*?volume/i,solver:solveVolumeHemisphere,useFullText:true},
  {regex:/volume.*?cuboid|cuboid.*?volume|TSA.*?cuboid|diagonal.*?cuboid/i,solver:solveVolumeCuboid,useFullText:true},
  {regex:/area.*?parallelogram/i,solver:solveAreaParallelogram,useFullText:true},
  {regex:/area.*?trapezium|trapezium.*?area/i,solver:solveAreaTrapezium,useFullText:true},
  {regex:/(?:HCF|GCD|LCM)\s*(?:and|&|of)\s*\d/i,solver:solveLCMGCD,useFullText:true},
  {regex:/square\s*root|sqrt/i,solver:solveSquareCubeRoot,useFullText:true},
  {regex:/cube\s*root/i,solver:solveSquareCubeRoot,useFullText:true},
  {regex:/(?:calculate|evaluate|compute|what is|find the value of)\s+[\d(][\d\s+\-*/().^]+/i,solver:solveEvaluateExpr,useFullText:true},
  {regex:/slope.*?y\s*=\s*\d|y\s*=\s*\d.*?x.*?[+\-]\s*\d/i,solver:solveLinearEq,useFullText:true},
  {regex:/\(a\+b\)\^2\s*-\s*\(a-b\)\^2/i,solver:solveLinearEq},

  // ── PHYSICS ──
  {regex:/(\d+)\s*kg.*?(\d+)\s*N.*?frictionless|find\s*acceleration/i,solver:solveNewton,useFullText:true},
  {regex:/(?:F\s*=\s*ma|force\s*=\s*mass|find\s*force).*?(\d+)\s*kg.*?(\d+)\s*m\/s/i,solver:solveForceMA,useFullText:true},
  {regex:/kinetic\s*energy|KE\s*=|find\s*KE/i,solver:solveKineticEnergy,useFullText:true},
  {regex:/thrown\s+upward|projectile.*?max.*?height/i,solver:solveProjectile,useFullText:true},
  {regex:/(\d+)\s*m\/s.*?(\d+)\s*m\/s[²2].*?(\d+)\s*s.*?(?:distance|displacement)/i,solver:solveKinematic,useFullText:true},
  {regex:/v[²2]\s*=\s*u[²2].*?2as|v.*u.*2as/i,solver:solveKinematicV2,useFullText:true},
  {regex:/dropped\s+from\s+(\d+)m.*?velocity|free\s*fall/i,solver:solveFreeFall,useFullText:true},
  {regex:/(\d+)\s*kg.*?climbs\s+(\d+)\s*m.*?(\d+)\s*s.*?power/i,solver:solveWorkPower},
  {regex:/(\d+)\s*kg.*?(\d+)\s*m\/s.*?(\d+)\s*kg.*?(\d+)\s*m\/s.*?collide/i,solver:solveMomentum},
  {regex:/(\d+)\s*kg.*?circle.*?(\d+)\s*m.*?(\d+)\s*m\/s.*?centripetal/i,solver:solveCircular},
  {regex:/resistance.*?(\d+)V.*?(\d+)A|ohm.*?law/i,solver:solveOhm,useFullText:true},
  {regex:/(?:series|parallel).*?(?:resistor|resistance)|\d+\s*ohm.*?\d+\s*ohm/i,solver:solveSeriesParallel,useFullText:true},
  {regex:/electrical\s*power|P\s*=\s*VI|circuit.*?power/i,solver:solvePowerCircuit,useFullText:true},
  {regex:/gravitational\s*force|force.*?gravitation/i,solver:solveGravitation,useFullText:true},
  {regex:/escape\s*velocity/i,solver:solveEscapeVelocity,useFullText:true},
  {regex:/orbital\s*velocity/i,solver:solveOrbitalVelocity,useFullText:true},
  {regex:/lens\s*formula|convex\s*lens|concave\s*lens/i,solver:solveLensFormula,useFullText:true},
  {regex:/mirror\s*formula|concave\s*mirror|convex\s*mirror/i,solver:solveMirrorFormula,useFullText:true},
  {regex:/snell.*?law|refraction|refractive.*?index/i,solver:solveSnellsLaw,useFullText:true},
  {regex:/wave\s*speed|frequency.*?wavelength|v\s*=\s*f/i,solver:solveWaveSpeed,useFullText:true},
  {regex:/specific\s*heat|heat\s*capacity|Q\s*=\s*mc/i,solver:solveSpecificHeat,useFullText:true},
  {regex:/density|mass.*?per.*?unit.*?volume/i,solver:solveDensity,useFullText:true},
  {regex:/pressure.*?\d+\s*N|P\s*=\s*F.*?A/i,solver:solvePressure,useFullText:true},
  {regex:/pendulum|time\s*period.*?oscillat/i,solver:solveSimplePendulum,useFullText:true},
  {regex:/de\s*broglie|wavelength.*?electron/i,solver:solveDeBroglie,useFullText:true},
  {regex:/coulomb.*?law|electrostatic.*?force/i,solver:solveCoulombLaw,useFullText:true},

  // ── CHEMISTRY ──
  {regex:/pH\s+of\s+(\d+)/i,solver:solvePH,useFullText:true},
  {regex:/molarity.*?(\d+)\s*g.*?(\d+)\s*mL/i,solver:solveMolarityGeneral,useFullText:true},
  {regex:/molality/i,solver:solveMolality,useFullText:true},
  {regex:/dilut|concentrated/i,solver:solveDilution,useFullText:true},
  {regex:/ideal\s*gas|PV\s*=\s*nRT|gas\s*law/i,solver:solveIdealGas,useFullText:true},
  {regex:/moles.*?(\d+)\s*g/i,solver:solveMolesGeneral,useFullText:true},
  {regex:/mass.*?from.*?moles|grams.*?\d+.*?moles/i,solver:solveMassFromMoles,useFullText:true},
  {regex:/molar\s*mass/i,solver:solveMolarMass,useFullText:true},
  {regex:/electron\s*config|electronic\s*config/i,solver:solveElectronConfig,useFullText:true},
  {regex:/(\d+)\s*mL.*?(\d+)\s*M.*?(\d+)\s*mL.*?NaOH|titration/i,solver:solveReaction},
  {regex:/(\d+)\s*atm.*?(\d+)\s*L.*?(\d+)\s*atm.*?(\d+)\s*K.*?volume/i,solver:solveGasLaw},
  {regex:/\d+\s*red.*?\d+\s*blue.*?\d+\s*green.*?probability/i,solver:solveLinearEq},
  {regex:/(\d+)th\s+term\s+of\s+AP/i,solver:solveAPSum,useFullText:true},
];

// ── JEE Advanced/Mains/KCET Extension: tried first above ──────────────

export async function tryLocalSolve(problem:string,subject:string):Promise<LocalSolution|null>{
  let norm=problem.toLowerCase().trim();

  // ── Universal arithmetic fallback: handles bare expressions like "2+2", "15*3", "144/12", etc. ──
  const arithOnly=norm.replace(/[?!.,;:"'\s=]+$/,'').replace(/^\s*(calculate|evaluate|compute|what is|find the value of|solve|\?)\s*/i,'').trim();
  const arithTest=arithOnly.replace(/×/g,'*').replace(/÷/g,'/').replace(/\^/g,'**').replace(/²/g,'**2').replace(/³/g,'**3').replace(/\bpi\b/gi,'3.14159265358979');
  if(/^[\d+\-*/().%eEPIsincotalgqrtbMC ,.]+$/i.test(arithTest)&&/\d/.test(arithTest)&&(arithTest.includes('+')||arithTest.includes('-')||arithTest.includes('*')||arithTest.includes('/'))){
    try{
      const reps=[['sqrt(','Math.sqrt('],['cbrt(','Math.cbrt('],['sin(','Math.sin('],['cos(','Math.cos('],['tan(','Math.tan('],['log(','Math.log10('],['ln(','Math.log('],['abs(','Math.abs(']];
      let ev=arithTest;for(const[from,to]of reps){ev=ev.split(from).join(to)}
      const result=new Function('"use strict";return('+ev+')')();
      if(typeof result==='number'&&isFinite(result)){
        const rounded=Math.round(result*10000)/10000;
        const display=Number.isInteger(rounded)?String(rounded):rounded.toString();
        console.log(`[Local-Arith] Solved: "${norm.slice(0,60)}" = ${display}`);
        return{finalAnswer:'= '+display,finalFormula:'= '+display,
          steps:[{desc:'Expression: '+arithOnly,formula:arithOnly},{desc:'Compute using BODMAS/PEMDAS',formula:'= '+display}],
          altSteps:[],similar:[],mistakes:['BODMAS order error','Sign mistake','Carry/borrow error']};
      }
    }catch{}
  }

  // Try JEE-level solvers FIRST (they handle harder problems)
  const jeeSol=tryJEESolve(norm,subject);
  if(jeeSol){console.log(`[Local-JEE] Solved: "${norm.slice(0,60)}..."`);return jeeSol;}

  // Fall back to CBSE/ICSE board-level solvers
  for(const rule of PATTERNS){
    const match=norm.match(rule.regex);
    if(match){
      try{const sol=rule.solver(match,rule.useFullText?norm:undefined);
        if(sol){console.log(`[Local] Matched: "${norm.slice(0,60)}..."`);return sol}
      }catch(e){console.error(`[Local] Error:`,e)}
    }
  }
  return null;
}
