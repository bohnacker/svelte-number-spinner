var app=function(){"use strict";function t(){}function e(t){return t()}function n(){return Object.create(null)}function s(t){t.forEach(e)}function o(t){return"function"==typeof t}function l(t,e){return t!=t?e==e:t!==e||t&&"object"==typeof t||"function"==typeof t}function i(t,e){t.appendChild(e)}function a(t){t.parentNode.removeChild(t)}function r(t){return document.createElement(t)}function u(t){return document.createTextNode(t)}function c(){return u(" ")}function f(t,e,n,s){return t.addEventListener(e,n,s),()=>t.removeEventListener(e,n,s)}function d(t){return function(e){return e.preventDefault(),t.call(this,e)}}function p(t,e,n){null==n?t.removeAttribute(e):t.getAttribute(e)!==n&&t.setAttribute(e,n)}function v(t,e){e=""+e,t.wholeText!==e&&(t.data=e)}let m;function g(t){m=t}const h=[],$=[],y=[],k=[],w=Promise.resolve();let b=!1;function x(t){y.push(t)}function z(t){k.push(t)}let S=!1;const _=new Set;function F(){if(!S){S=!0;do{for(let t=0;t<h.length;t+=1){const e=h[t];g(e),E(e.$$)}for(g(null),h.length=0;$.length;)$.pop()();for(let t=0;t<y.length;t+=1){const e=y[t];_.has(e)||(_.add(e),e())}y.length=0}while(h.length);for(;k.length;)k.pop()();b=!1,S=!1,_.clear()}}function E(t){if(null!==t.fragment){t.update(),s(t.before_update);const e=t.dirty;t.dirty=[-1],t.fragment&&t.fragment.p(t.ctx,e),t.after_update.forEach(x)}}const C=new Set;function M(t,e){t&&t.i&&(C.delete(t),t.i(e))}function L(t,e,n,s){if(t&&t.o){if(C.has(t))return;C.add(t),undefined.c.push((()=>{C.delete(t),s&&(n&&t.d(1),s())})),t.o(e)}}function A(t,e,n){const s=t.$$.props[e];void 0!==s&&(t.$$.bound[s]=n,n(t.$$.ctx[s]))}function N(t){t&&t.c()}function T(t,n,l,i){const{fragment:a,on_mount:r,on_destroy:u,after_update:c}=t.$$;a&&a.m(n,l),i||x((()=>{const n=r.map(e).filter(o);u?u.push(...n):s(n),t.$$.on_mount=[]})),c.forEach(x)}function O(t,e){const n=t.$$;null!==n.fragment&&(s(n.on_destroy),n.fragment&&n.fragment.d(e),n.on_destroy=n.fragment=null,n.ctx=[])}function j(t,e){-1===t.$$.dirty[0]&&(h.push(t),b||(b=!0,w.then(F)),t.$$.dirty.fill(0)),t.$$.dirty[e/31|0]|=1<<e%31}function D(e,o,l,i,r,u,c=[-1]){const f=m;g(e);const d=e.$$={fragment:null,ctx:null,props:u,update:t,not_equal:r,bound:n(),on_mount:[],on_destroy:[],on_disconnect:[],before_update:[],after_update:[],context:new Map(f?f.$$.context:o.context||[]),callbacks:n(),dirty:c,skip_bound:!1};let p=!1;if(d.ctx=l?l(e,o.props||{},((t,n,...s)=>{const o=s.length?s[0]:n;return d.ctx&&r(d.ctx[t],d.ctx[t]=o)&&(!d.skip_bound&&d.bound[t]&&d.bound[t](o),p&&j(e,t)),n})):[],d.update(),p=!0,s(d.before_update),d.fragment=!!i&&i(d.ctx),o.target){if(o.hydrate){const t=function(t){return Array.from(t.childNodes)}(o.target);d.fragment&&d.fragment.l(t),t.forEach(a)}else d.fragment&&d.fragment.c();o.intro&&M(e.$$.fragment),T(e,o.target,o.anchor,o.customElement),F()}g(f)}var I="undefined"!=typeof globalThis?globalThis:"undefined"!=typeof window?window:"undefined"!=typeof global?global:"undefined"!=typeof self?self:{};var P,U=(function(t,e){t.exports=function(){function t(){}function e(t,e){for(const n in e)t[n]=e[n];return t}function n(t){return t()}function s(){return Object.create(null)}function o(t){t.forEach(n)}function l(t){return"function"==typeof t}function i(t,e){return t!=t?e==e:t!==e||t&&"object"==typeof t||"function"==typeof t}function a(t){return 0===Object.keys(t).length}function r(t){const e={};for(const n in t)"$"!==n[0]&&(e[n]=t[n]);return e}function u(t){return null==t?"":t}function c(t,e){t.appendChild(e)}function f(t,e,n){t.insertBefore(e,n||null)}function d(t){t.parentNode.removeChild(t)}function p(t){return document.createElement(t)}function v(t){return document.createTextNode(t)}function m(){return v(" ")}function g(t,e,n,s){return t.addEventListener(e,n,s),()=>t.removeEventListener(e,n,s)}function h(t){return function(e){return e.preventDefault(),t.call(this,e)}}function $(t){return function(e){return e.stopPropagation(),t.call(this,e)}}function y(t,e,n){null==n?t.removeAttribute(e):t.getAttribute(e)!==n&&t.setAttribute(e,n)}function k(t){return Array.from(t.childNodes)}function w(t,e){t.value=null==e?"":e}function b(t,e,n){t.classList[n?"add":"remove"](e)}function x(t,e){const n=document.createEvent("CustomEvent");return n.initCustomEvent(t,!1,!1,e),n}let z;function S(t){z=t}function _(){if(!z)throw new Error("Function called outside component initialization");return z}function F(t){_().$$.on_mount.push(t)}function E(){const t=_();return(e,n)=>{const s=t.$$.callbacks[e];if(s){const o=x(e,n);s.slice().forEach((e=>{e.call(t,o)}))}}}function C(t,e){const n=t.$$.callbacks[e.type];n&&n.slice().forEach((t=>t(e)))}const M=[],L=[],A=[],N=[],T=Promise.resolve();let O=!1;function j(){O||(O=!0,T.then(Y))}function D(){return j(),T}function P(t){A.push(t)}let U=!1;const X=new Set;function Y(){if(!U){U=!0;do{for(let t=0;t<M.length;t+=1){const e=M[t];S(e),q(e.$$)}for(S(null),M.length=0;L.length;)L.pop()();for(let t=0;t<A.length;t+=1){const e=A[t];X.has(e)||(X.add(e),e())}A.length=0}while(M.length);for(;N.length;)N.pop()();O=!1,U=!1,X.clear()}}function q(t){if(null!==t.fragment){t.update(),o(t.before_update);const e=t.dirty;t.dirty=[-1],t.fragment&&t.fragment.p(t.ctx,e),t.after_update.forEach(P)}}const B=new Set;function G(t,e){t&&t.i&&(B.delete(t),t.i(e))}const H="undefined"!=typeof window?window:"undefined"!=typeof globalThis?globalThis:I;function R(t,e,s,i){const{fragment:a,on_mount:r,on_destroy:u,after_update:c}=t.$$;a&&a.m(e,s),i||P((()=>{const e=r.map(n).filter(l);u?u.push(...e):o(e),t.$$.on_mount=[]})),c.forEach(P)}function J(t,e){const n=t.$$;null!==n.fragment&&(o(n.on_destroy),n.fragment&&n.fragment.d(e),n.on_destroy=n.fragment=null,n.ctx=[])}function K(t,e){-1===t.$$.dirty[0]&&(M.push(t),j(),t.$$.dirty.fill(0)),t.$$.dirty[e/31|0]|=1<<e%31}function Q(e,n,l,i,a,r,u=[-1]){const c=z;S(e);const f=e.$$={fragment:null,ctx:null,props:r,update:t,not_equal:a,bound:s(),on_mount:[],on_destroy:[],on_disconnect:[],before_update:[],after_update:[],context:new Map(c?c.$$.context:n.context||[]),callbacks:s(),dirty:u,skip_bound:!1};let p=!1;if(f.ctx=l?l(e,n.props||{},((t,n,...s)=>{const o=s.length?s[0]:n;return f.ctx&&a(f.ctx[t],f.ctx[t]=o)&&(!f.skip_bound&&f.bound[t]&&f.bound[t](o),p&&K(e,t)),n})):[],f.update(),p=!0,o(f.before_update),f.fragment=!!i&&i(f.ctx),n.target){if(n.hydrate){const t=k(n.target);f.fragment&&f.fragment.l(t),t.forEach(d)}else f.fragment&&f.fragment.c();n.intro&&G(e.$$.fragment),R(e,n.target,n.anchor,n.customElement),Y()}S(c)}class V{$destroy(){J(this,1),this.$destroy=t}$on(t,e){const n=this.$$.callbacks[t]||(this.$$.callbacks[t]=[]);return n.push(e),()=>{const t=n.indexOf(e);-1!==t&&n.splice(t,1)}}$set(t){this.$$set&&!a(t)&&(this.$$.skip_bound=!0,this.$$set(t),this.$$.skip_bound=!1)}}const{document:W}=H;function Z(){var t=p("style");t.id="svelte-xg45mw-style",t.textContent=".default.svelte-xg45mw{display:inline-block;box-sizing:border-box;font-variant-numeric:tabular-nums;background-color:white;color:black;width:4em;height:1.6em;margin:0px;padding:0.25em;border:0.075em solid #0004;border-radius:0.15em;text-align:right;vertical-align:baseline;cursor:ew-resize}.default.svelte-xg45mw:focus{border:0.075em solid #06f;outline:none}.default.fast.svelte-xg45mw{border-top-width:0.15em;padding-top:0.175em}.default.slow.svelte-xg45mw{border-bottom-width:0.15em;padding-bottom:0.175em}.default.dragging.svelte-xg45mw{border-color:#04c}.default.editing.svelte-xg45mw{cursor:initial}.drag.svelte-xg45mw{user-select:none}.drag.svelte-xg45mw::selection{background:#0000}.inactive.svelte-xg45mw{display:none !important}",c(W.head,t)}function tt(e){let n,s,i,a,r,c,v,k;return{c(){n=p("input"),i=m(),a=p("input"),y(n,"type","text"),y(n,"style",e[10]),y(n,"class",s=u(e[24].class)+" svelte-xg45mw"),n.readOnly=!0,y(n,"contenteditable",!1),y(n,"tabindex","0"),b(n,"default",!e[24].class),b(n,"drag",!0),b(n,"dragging",e[6]),b(n,"fast",e[7]>1?"fast":""),b(n,"slow",e[7]<1?"slow":""),b(n,"focus",e[4]),b(n,"inactive",e[8]),y(a,"style",e[10]),y(a,"class",r=u(e[24].class)+" svelte-xg45mw"),y(a,"type","text"),y(a,"inputmode",c=nt(e[1])&&nt(e[0])&&e[0]>=0?"numeric":"text"),b(a,"default",!e[24].class),b(a,"edit",!0),b(a,"editing",e[8]),b(a,"focus",e[5]),b(a,"inactive",!e[8])},m(t,s){f(t,n,s),e[57](n),w(n,e[9]),f(t,i,s),f(t,a,s),e[59](a),w(a,e[9]),v||(k=[g(window,"mousemove",(function(){l(e[6]?e[14]:"")&&(e[6]?e[14]:"").apply(this,arguments)})),g(window,"touchmove",(function(){l(e[6]?e[13]:"")&&(e[6]?e[13]:"").apply(this,arguments)})),g(window,"mouseup",$((function(){l(e[6]?e[16]:e[20])&&(e[6]?e[16]:e[20]).apply(this,arguments)}))),g(window,"touchend",$((function(){l(e[6]?e[15]:e[20])&&(e[6]?e[15]:e[20]).apply(this,arguments)}))),g(window,"keydown",e[21]),g(window,"keyup",e[22]),g(n,"mousedown",$(e[12])),g(n,"touchstart",$(h(e[11]))),g(n,"dblclick",$(et)),g(n,"focus",e[17]),g(n,"blur",e[18]),g(n,"keydown",e[54]),g(n,"keypress",e[55]),g(n,"keyup",e[56]),g(n,"input",e[58]),g(a,"mouseup",$(st)),g(a,"touchend",$(ot)),g(a,"focus",e[19]),g(a,"blur",e[20]),g(a,"input",e[23]),g(a,"keydown",e[51]),g(a,"keypress",e[52]),g(a,"keyup",e[53]),g(a,"input",e[60])],v=!0)},p(t,o){e=t,1024&o[0]&&y(n,"style",e[10]),16777216&o[0]&&s!==(s=u(e[24].class)+" svelte-xg45mw")&&y(n,"class",s),512&o[0]&&n.value!==e[9]&&w(n,e[9]),16777216&o[0]&&b(n,"default",!e[24].class),16777216&o[0]&&b(n,"drag",!0),16777280&o[0]&&b(n,"dragging",e[6]),16777344&o[0]&&b(n,"fast",e[7]>1?"fast":""),16777344&o[0]&&b(n,"slow",e[7]<1?"slow":""),16777232&o[0]&&b(n,"focus",e[4]),16777472&o[0]&&b(n,"inactive",e[8]),1024&o[0]&&y(a,"style",e[10]),16777216&o[0]&&r!==(r=u(e[24].class)+" svelte-xg45mw")&&y(a,"class",r),3&o[0]&&c!==(c=nt(e[1])&&nt(e[0])&&e[0]>=0?"numeric":"text")&&y(a,"inputmode",c),512&o[0]&&a.value!==e[9]&&w(a,e[9]),16777216&o[0]&&b(a,"default",!e[24].class),16777216&o[0]&&b(a,"edit",!0),16777472&o[0]&&b(a,"editing",e[8]),16777248&o[0]&&b(a,"focus",e[5]),16777472&o[0]&&b(a,"inactive",!e[8])},i:t,o:t,d(t){t&&d(n),e[57](null),t&&d(i),t&&d(a),e[59](null),v=!1,o(k)}}}function et(t){}function nt(t){return t==Math.round(t)}const st=t=>{},ot=t=>{};function lt(t,n,s){const o=E();let{options:l={}}=n,{value:i=l.value??0}=n;i=parseFloat(i);let{min:a=l.min??-1e12}=n;a=parseFloat(a);let{max:u=l.max??1e12}=n;u=parseFloat(u);let{step:c=l.step??1}=n;c=parseFloat(c);let{precision:f=l.precision??c}=n;f=parseFloat(f);let{speed:d=l.speed??1}=n;d=parseFloat(d);let{keyStep:p=l.keyStep??10*c}=n;p=parseFloat(p);let{keyStepSlow:v=l.keyStepSlow??c}=n;v=parseFloat(v);let{keyStepFast:m=l.keyStepFast??100*c}=n;m=parseFloat(m);let{decimals:g=l.decimals??0}=n;g=parseFloat(g);let h,$,y,k,w,b,x,z,S,_,{format:M=l.format??void 0}=n,{parse:A=l.parse??void 0}=n,{horizontal:N=l.horizontal??!0}=n,{vertical:T=l.vertical??!1}=n,{circular:O=l.circular??!1}=n,{mainStyle:j=l.mainStyle??void 0}=n,{fastStyle:I=l.fastStyle??void 0}=n,{slowStyle:P=l.slowStyle??void 0}=n,{focusStyle:U=l.focusStyle??void 0}=n,{draggingStyle:X=l.draggingStyle??void 0}=n,{editingStyle:Y=l.editingStyle??void 0}=n,{cursor:q=l.cursor??void 0}=n,B=!1,G=!1,H=!1,R=!1,J=!1,K=1,Q=!1,V=!1,W=!1,Z=null,tt=null;function et(t){o("consoleLog",t.type),B=!0,nt(t)}function nt(t){o("consoleLog",t.type),w=document.activeElement===y,s(6,J=!0),y.focus(),b=!1,x=B?t.touches[0].clientX:t.clientX,z=B?t.touches[0].clientY:t.clientY,s(6,J=!0),yt(i)}function st(t){B=!0,ot(t)}function ot(t){let e=B?t.touches[0].clientX:t.clientX,n=B?t.touches[0].clientY:t.clientY,s=N?e-x:0,l=T?-(n-z):0,i=Math.abs(s)>Math.abs(l)?s:l;0==i||b||(b=!0,o("dragstart")),ht(i*K),x=e,z=n}function lt(t){o("consoleLog",t.type),it(t)}function it(t){o("consoleLog",t.type),J&&b&&o("dragend"),s(6,J=!1),w&&!b&&mt()}function at(t){o("consoleLog",t.type),s(4,G=!0),vt()}function rt(t){o("consoleLog",t.type),s(4,G=!1),vt()}function ut(t){o("consoleLog",t.type),s(5,H=!0),vt()}function ct(t){o("consoleLog",t.type),s(5,H=!1),vt(),gt()}function ft(t){"Enter"==t.key&&t.preventDefault(),t.target!=y&&t.target!=k||o("consoleLog",t.type),"Shift"==t.key&&s(47,V=!0),"Alt"==t.key&&s(46,Q=!0)}function dt(t){if(t.target!=y&&t.target!=k||o("consoleLog",t.type),"Shift"==t.key&&s(47,V=!1),"Alt"==t.key&&s(46,Q=!1),G&&!W){let e=p;K<1&&(e=v),K>1&&(e=m),"ArrowUp"!=t.key&&"ArrowRight"!=t.key||$t(e),"ArrowDown"!=t.key&&"ArrowLeft"!=t.key||$t(-e),"Enter"==t.key&&mt()}else H&&W&&("Enter"!=t.key&&"Escape"!=t.key||gt())}function pt(t){let e=parseFloat(k.value);isNaN(e)||(h=e,h=kt(h),o("input",parseFloat(wt(h))))}async function vt(){await D(),document.activeElement==y||document.activeElement==k?R||(R=!0,o("focus")):R&&(R=!1,o("blur"))}async function mt(){s(8,W=!0),await D(),k.focus(),k.select(),o("editstart")}function gt(){if(W){if(s(8,W=!1),A)h=A($),yt(h);else{let t=parseFloat(k.value);isNaN(t)||(h=parseFloat($),yt(h))}document.activeElement===k&&setTimeout((()=>{y.focus()}),0),o("editend")}}function ht(t){h=h??parseFloat($),h+=t*c*d,yt(h)}function $t(t){h=h??parseFloat($),h+=t,yt(h)}function yt(t){h=parseFloat(t),h=kt(h),s(9,$=Math.round((h-a)/c)*c+a),s(9,$=M?M($):$.toFixed(g)),s(25,i=wt(h)),o("input",parseFloat(i)),o("change",parseFloat(i))}function kt(t){if(s(0,a=parseFloat(a)),s(26,u=parseFloat(u)),O){let e=u-a;if(0===e)return a;let n=t<a?Math.ceil((a-t)/e):0;t=(t-a+e*n)%e+a}else t=Math.min(Math.max(t,a),u);return t}function wt(t){let e;t=Math.round((parseFloat(t)-a)/f)*f+a;let n=f<1?Math.ceil(-Math.log10(f)):0;return e=c.toString().split(".")[1],e&&(n=Math.max(n,e.length)),e=a.toString().split(".")[1],e&&(n=Math.max(n,e.length)),parseFloat(t.toFixed(n))}function bt(e){C(t,e)}function xt(e){C(t,e)}function zt(e){C(t,e)}function St(e){C(t,e)}function _t(e){C(t,e)}function Ft(e){C(t,e)}function Et(t){L[t?"unshift":"push"]((()=>{y=t,s(2,y)}))}function Ct(){$=this.value,s(9,$)}function Mt(t){L[t?"unshift":"push"]((()=>{k=t,s(3,k)}))}function Lt(){$=this.value,s(9,$)}return F((()=>{s(48,Z=document.querySelector("html")),s(49,tt=Z.style.cursor)})),yt(i),t.$$set=t=>{s(24,n=e(e({},n),r(t))),"options"in t&&s(33,l=t.options),"value"in t&&s(25,i=t.value),"min"in t&&s(0,a=t.min),"max"in t&&s(26,u=t.max),"step"in t&&s(1,c=t.step),"precision"in t&&s(27,f=t.precision),"speed"in t&&s(28,d=t.speed),"keyStep"in t&&s(29,p=t.keyStep),"keyStepSlow"in t&&s(30,v=t.keyStepSlow),"keyStepFast"in t&&s(31,m=t.keyStepFast),"decimals"in t&&s(32,g=t.decimals),"format"in t&&s(34,M=t.format),"parse"in t&&s(35,A=t.parse),"horizontal"in t&&s(36,N=t.horizontal),"vertical"in t&&s(37,T=t.vertical),"circular"in t&&s(38,O=t.circular),"mainStyle"in t&&s(39,j=t.mainStyle),"fastStyle"in t&&s(40,I=t.fastStyle),"slowStyle"in t&&s(41,P=t.slowStyle),"focusStyle"in t&&s(42,U=t.focusStyle),"draggingStyle"in t&&s(43,X=t.draggingStyle),"editingStyle"in t&&s(44,Y=t.editingStyle),"cursor"in t&&s(45,q=t.cursor)},t.$$.update=()=>{12&t.$$.dirty[0]&&y&&k&&vt(),33554752&t.$$.dirty[0]&&(W||J||yt(i)),272&t.$$.dirty[0]|98304&t.$$.dirty[1]&&(s(7,K=1),G&&!W&&(Q&&V?s(7,K=10):Q&&s(7,K=.1))),64&t.$$.dirty[0]|933984&t.$$.dirty[1]&&(s(50,_=N?T?"move":"ew-resize":"ns-resize"),Z&&s(48,Z.style.cursor=J?q??_:tt,Z)),1520&t.$$.dirty[0]|556800&t.$$.dirty[1]&&(s(10,S=j??""),s(10,S+=(G||H)&&U?";"+U:""),s(10,S+=!W&&K>1&&I?";"+I:""),s(10,S+=!W&&K<1&&P?";"+P:""),s(10,S+=J&&X?";"+X:""),s(10,S+=W&&Y?";"+Y:""),s(10,S+=W?"":";cursor:"+(q??_)))},n=r(n),[a,c,y,k,G,H,J,K,W,$,S,et,nt,st,ot,lt,it,at,rt,ut,ct,ft,dt,pt,n,i,u,f,d,p,v,m,g,l,M,A,N,T,O,j,I,P,U,X,Y,q,Q,V,Z,tt,_,bt,xt,zt,St,_t,Ft,Et,Ct,Mt,Lt]}class it extends V{constructor(t){super(),W.getElementById("svelte-xg45mw-style")||Z(),Q(this,t,lt,tt,i,{options:33,value:25,min:0,max:26,step:1,precision:27,speed:28,keyStep:29,keyStepSlow:30,keyStepFast:31,decimals:32,format:34,parse:35,horizontal:36,vertical:37,circular:38,mainStyle:39,fastStyle:40,slowStyle:41,focusStyle:42,draggingStyle:43,editingStyle:44,cursor:45},[-1,-1,-1])}}return it}()}(P={exports:{}},P.exports),P.exports);function X(t){let e,n,o,l,m,g,h,y,k,w,b,x,S,_,F,E,C,j,D,I,P,X,R,J,K,Q,V,W,Z,tt,et,nt,st,ot,lt,it,at,rt,ut,ct,ft,dt,pt,vt,mt,gt,ht,$t,yt,kt,wt,bt,xt,zt,St,_t,Ft,Et,Ct,Mt,Lt,At,Nt,Tt,Ot,jt,Dt,It,Pt,Ut,Xt,Yt,qt,Bt,Gt,Ht,Rt,Jt,Kt,Qt,Vt,Wt,Zt,te,ee,ne,se,oe,le,ie,ae,re,ue,ce,fe,de,pe,ve,me,ge,he,$e,ye,ke,we,be,xe,ze,Se,_e,Fe,Ee,Ce,Me,Le,Ae,Ne,Te,Oe,je,De,Ie,Pe,Ue,Xe,Ye,qe,Be,Ge,He,Re,Je,Ke,Qe,Ve,We,Ze,tn,en,nn,sn,on,ln,an,rn,un,cn,fn,dn,pn,vn,mn,gn,hn,$n,yn,kn,wn,bn,xn,zn,Sn,_n,Fn,En,Cn,Mn,Ln,An,Nn,Tn,On,jn,Dn,In,Pn,Un,Xn,Yn,qn,Bn,Gn,Hn,Rn,Jn;function Kn(e){t[16](e)}let Qn={};function Vn(e){t[17](e)}void 0!==t[0]&&(Qn.value=t[0]),E=new U({props:Qn}),$.push((()=>A(E,"value",Kn)));let Wn={min:"0",max:"360",vertical:!0,circular:!0};function Zn(e){t[18](e)}void 0!==t[1]&&(Wn.value=t[1]),Z=new U({props:Wn}),$.push((()=>A(Z,"value",Vn)));let ts={min:"-5",max:"5",step:"0.01",decimals:"2",precision:"0.001",editOnClick:!0};function es(e){t[19](e)}void 0!==t[2]&&(ts.value=t[2]),dt=new U({props:ts}),$.push((()=>A(dt,"value",Zn)));let ns={step:"10",mainStyle:"color:#aaa; width:80px; border-radius:20px",focusStyle:"color:#06f",draggingStyle:"border-color:#f00",editingStyle:"color:#00f; background-color:#06f4",fastStyle:"color:#f00",slowStyle:"color:#0c0",cursor:"url(customcursor.png) 16 16, auto"};function ss(e){t[20](e)}void 0!==t[3]&&(ns.value=t[3]),St=new U({props:ns}),$.push((()=>A(St,"value",es)));let os={min:"0",max:"1",step:"0.001",decimals:"3",class:"number-spinner-custom"};function ls(e){t[27](e)}void 0!==t[4]&&(os.value=t[4]),It=new U({props:os}),$.push((()=>A(It,"value",ss))),le=new U({props:{value:Y,min:"-100",max:"100"}}),le.$on("change",t[21]),le.$on("input",t[22]),le.$on("keyup",t[23]),le.$on("editstart",t[24]),le.$on("editend",t[25]);let is={min:"0",max:"12",circular:!0};function as(e){t[29](e)}void 0!==t[9]&&(is.value=t[9]),we=new U({props:is}),$.push((()=>A(we,"value",ls)));let rs={options:t[15]};function us(e){t[30](e)}void 0!==t[10]&&(rs.value=t[10]),Ue=new U({props:rs}),$.push((()=>A(Ue,"value",as)));let cs={format:q,parse:B};function fs(e){t[31](e)}void 0!==t[11]&&(cs.value=t[11]),Ze=new U({props:cs}),$.push((()=>A(Ze,"value",us)));let ds={min:0,max:1440,keyStep:15,keyStepSlow:1,keyStepFast:60,circular:!0,format:G,parse:H};function ps(e){t[34](e)}void 0!==t[12]&&(ds.value=t[12]),pn=new U({props:ds}),$.push((()=>A(pn,"value",fs)));let vs={step:.01,format:t[32],parse:t[33]};function ms(e){t[35](e)}void 0!==t[13]&&(vs.value=t[13]),_n=new U({props:vs}),$.push((()=>A(_n,"value",ps)));let gs={};return void 0!==t[14]&&(gs.value=t[14]),Xn=new U({props:gs}),$.push((()=>A(Xn,"value",ms))),{c(){e=r("main"),n=r("h2"),n.textContent="Svelte Number Spinner Example",o=c(),l=r("p"),l.innerHTML='Change the values of the number spinners through mousedrag and arrow keys. Press <i class="svelte-11zku27">Alt</i> for\n    smaller steps, <i class="svelte-11zku27">Alt+Shift</i> for larger steps. Click without dragging to edit.',m=c(),g=r("hr"),h=c(),y=r("div"),k=r("div"),w=u("Default: no range limits, step = 1"),b=r("br"),x=u("Current value is "),S=u(t[0]),_=c(),F=r("div"),N(E.$$.fragment),j=c(),D=r("hr"),I=c(),P=r("div"),X=r("div"),R=u("Range: 0 - 360, vertical = true (dragging and arrow keys up/down will also change the value),\n      circular = true "),J=r("br"),K=u("Current value is "),Q=u(t[1]),V=c(),W=r("div"),N(Z.$$.fragment),et=c(),nt=r("hr"),st=c(),ot=r("div"),lt=r("div"),it=u("step = 0.01, decimals = 2, precision = 0.001"),at=r("br"),rt=u("Current value is "),ut=u(t[2]),ct=c(),ft=r("div"),N(dt.$$.fragment),vt=c(),mt=r("hr"),gt=c(),ht=r("div"),$t=r("div"),yt=u("Individual styling using props."),kt=r("br"),wt=u("Current value is "),bt=u(t[3]),xt=c(),zt=r("div"),N(St.$$.fragment),Ft=c(),Et=r("hr"),Ct=c(),Mt=r("div"),Lt=r("div"),At=u("Individual styling using custom class."),Nt=r("br"),Tt=u("Current value is "),Ot=u(t[4]),jt=c(),Dt=r("div"),N(It.$$.fragment),Ut=c(),Xt=r("hr"),Yt=c(),qt=r("div"),Bt=r("div"),Gt=u("Get value through input and change events."),Ht=r("br"),Rt=u("\n      Current input value is "),Jt=u(t[5]),Kt=r("br"),Qt=u("\n      Current change value is "),Vt=u(t[6]),Wt=r("br"),Zt=u("\n      Edit mode is "),te=u(t[7]),ee=u(". Last key pressed: "),ne=u(t[8]),se=c(),oe=r("div"),N(le.$$.fragment),ie=c(),ae=r("hr"),re=c(),ue=r("div"),ce=r("div"),fe=u("Test correct updating of the value if changed from outside."),de=r("br"),pe=u("\n      Current value is "),ve=u(t[9]),me=r("br"),ge=c(),he=r("div"),$e=r("button"),$e.textContent="–",ye=c(),ke=r("div"),N(we.$$.fragment),xe=c(),ze=r("div"),Se=r("button"),Se.textContent="+",_e=c(),Fe=r("hr"),Ee=c(),Ce=r("div"),Me=r("div"),Le=u("Giving some of the props by options object."),Ae=r("br"),Ne=c(),Te=u("{ min: -5.5, max: 5.5, step: 1, keyStep: 1, keyStepFast: 2, decimals: 1, speed: 0.04 }"),Oe=r("br"),je=u("\n      Current value is "),De=u(t[10]),Ie=c(),Pe=r("div"),N(Ue.$$.fragment),Ye=c(),qe=r("hr"),Be=c(),Ge=r("div"),He=r("div"),Re=u("Using callbacks to format and parse the displayed value as a currency."),Je=r("br"),Ke=u("Current value is "),Qe=u(t[11]),Ve=c(),We=r("div"),N(Ze.$$.fragment),en=c(),nn=r("hr"),sn=c(),on=r("div"),ln=r("div"),an=u("Using callbacks to format and parse the displayed value as time of day."),rn=r("br"),un=u("Current value is "),cn=u(t[12]),fn=c(),dn=r("div"),N(pn.$$.fragment),mn=c(),gn=r("hr"),hn=c(),$n=r("div"),yn=r("div"),kn=u("Using format and parse to implement a exponential/logarithmic scale."),wn=r("br"),bn=u("Current value is "),xn=u(t[13]),zn=c(),Sn=r("div"),N(_n.$$.fragment),En=c(),Cn=r("hr"),Mn=c(),Ln=r("div"),An=r("div"),Nn=u("Hitting enter should not submit the form."),Tn=r("br"),On=u("Current value is "),jn=u(t[14]),Dn=c(),In=r("div"),Pn=r("form"),Un=r("div"),N(Xn.$$.fragment),qn=c(),Bn=r("div"),Gn=r("button"),Gn.textContent="Submit",p(n,"class","svelte-11zku27"),p(l,"class","svelte-11zku27"),p(g,"class","svelte-11zku27"),p(b,"class","svelte-11zku27"),p(k,"class","explanation svelte-11zku27"),p(F,"class","right svelte-11zku27"),p(y,"class","row svelte-11zku27"),p(D,"class","svelte-11zku27"),p(J,"class","svelte-11zku27"),p(X,"class","explanation svelte-11zku27"),p(W,"class","right svelte-11zku27"),p(P,"class","row svelte-11zku27"),p(nt,"class","svelte-11zku27"),p(at,"class","svelte-11zku27"),p(lt,"class","explanation svelte-11zku27"),p(ft,"class","right svelte-11zku27"),p(ot,"class","row svelte-11zku27"),p(mt,"class","svelte-11zku27"),p(kt,"class","svelte-11zku27"),p($t,"class","explanation svelte-11zku27"),p(zt,"class","right svelte-11zku27"),p(ht,"class","row svelte-11zku27"),p(Et,"class","svelte-11zku27"),p(Nt,"class","svelte-11zku27"),p(Lt,"class","explanation svelte-11zku27"),p(Dt,"class","right svelte-11zku27"),p(Mt,"class","row svelte-11zku27"),p(Xt,"class","svelte-11zku27"),p(Ht,"class","svelte-11zku27"),p(Kt,"class","svelte-11zku27"),p(Wt,"class","svelte-11zku27"),p(Bt,"class","explanation svelte-11zku27"),p(oe,"class","right svelte-11zku27"),p(qt,"class","row svelte-11zku27"),p(ae,"class","svelte-11zku27"),p(de,"class","svelte-11zku27"),p(me,"class","svelte-11zku27"),p(ce,"class","explanation svelte-11zku27"),p($e,"class","svelte-11zku27"),p(he,"class","svelte-11zku27"),p(ke,"class","right small-margin svelte-11zku27"),p(Se,"class","svelte-11zku27"),p(ze,"class","svelte-11zku27"),p(ue,"class","row svelte-11zku27"),p(Fe,"class","svelte-11zku27"),p(Ae,"class","svelte-11zku27"),p(Oe,"class","svelte-11zku27"),p(Me,"class","explanation svelte-11zku27"),p(Pe,"class","right svelte-11zku27"),p(Ce,"class","row svelte-11zku27"),p(qe,"class","svelte-11zku27"),p(Je,"class","svelte-11zku27"),p(He,"class","explanation svelte-11zku27"),p(We,"class","right svelte-11zku27"),p(Ge,"class","row svelte-11zku27"),p(nn,"class","svelte-11zku27"),p(rn,"class","svelte-11zku27"),p(ln,"class","explanation svelte-11zku27"),p(dn,"class","right svelte-11zku27"),p(on,"class","row svelte-11zku27"),p(gn,"class","svelte-11zku27"),p(wn,"class","svelte-11zku27"),p(yn,"class","explanation svelte-11zku27"),p(Sn,"class","right svelte-11zku27"),p($n,"class","row svelte-11zku27"),p(Cn,"class","svelte-11zku27"),p(Tn,"class","svelte-11zku27"),p(An,"class","explanation svelte-11zku27"),p(Un,"class","svelte-11zku27"),p(Gn,"class","svelte-11zku27"),p(Bn,"class","svelte-11zku27"),p(Pn,"class","svelte-11zku27"),p(In,"class","right svelte-11zku27"),p(Ln,"class","row svelte-11zku27"),p(e,"class","svelte-11zku27")},m(s,a){!function(t,e,n){t.insertBefore(e,n||null)}(s,e,a),i(e,n),i(e,o),i(e,l),i(e,m),i(e,g),i(e,h),i(e,y),i(y,k),i(k,w),i(k,b),i(k,x),i(k,S),i(y,_),i(y,F),T(E,F,null),i(e,j),i(e,D),i(e,I),i(e,P),i(P,X),i(X,R),i(X,J),i(X,K),i(X,Q),i(P,V),i(P,W),T(Z,W,null),i(e,et),i(e,nt),i(e,st),i(e,ot),i(ot,lt),i(lt,it),i(lt,at),i(lt,rt),i(lt,ut),i(ot,ct),i(ot,ft),T(dt,ft,null),i(e,vt),i(e,mt),i(e,gt),i(e,ht),i(ht,$t),i($t,yt),i($t,kt),i($t,wt),i($t,bt),i(ht,xt),i(ht,zt),T(St,zt,null),i(e,Ft),i(e,Et),i(e,Ct),i(e,Mt),i(Mt,Lt),i(Lt,At),i(Lt,Nt),i(Lt,Tt),i(Lt,Ot),i(Mt,jt),i(Mt,Dt),T(It,Dt,null),i(e,Ut),i(e,Xt),i(e,Yt),i(e,qt),i(qt,Bt),i(Bt,Gt),i(Bt,Ht),i(Bt,Rt),i(Bt,Jt),i(Bt,Kt),i(Bt,Qt),i(Bt,Vt),i(Bt,Wt),i(Bt,Zt),i(Bt,te),i(Bt,ee),i(Bt,ne),i(qt,se),i(qt,oe),T(le,oe,null),i(e,ie),i(e,ae),i(e,re),i(e,ue),i(ue,ce),i(ce,fe),i(ce,de),i(ce,pe),i(ce,ve),i(ce,me),i(ue,ge),i(ue,he),i(he,$e),i(ue,ye),i(ue,ke),T(we,ke,null),i(ue,xe),i(ue,ze),i(ze,Se),i(e,_e),i(e,Fe),i(e,Ee),i(e,Ce),i(Ce,Me),i(Me,Le),i(Me,Ae),i(Me,Ne),i(Me,Te),i(Me,Oe),i(Me,je),i(Me,De),i(Ce,Ie),i(Ce,Pe),T(Ue,Pe,null),i(e,Ye),i(e,qe),i(e,Be),i(e,Ge),i(Ge,He),i(He,Re),i(He,Je),i(He,Ke),i(He,Qe),i(Ge,Ve),i(Ge,We),T(Ze,We,null),i(e,en),i(e,nn),i(e,sn),i(e,on),i(on,ln),i(ln,an),i(ln,rn),i(ln,un),i(ln,cn),i(on,fn),i(on,dn),T(pn,dn,null),i(e,mn),i(e,gn),i(e,hn),i(e,$n),i($n,yn),i(yn,kn),i(yn,wn),i(yn,bn),i(yn,xn),i($n,zn),i($n,Sn),T(_n,Sn,null),i(e,En),i(e,Cn),i(e,Mn),i(e,Ln),i(Ln,An),i(An,Nn),i(An,Tn),i(An,On),i(An,jn),i(Ln,Dn),i(Ln,In),i(In,Pn),i(Pn,Un),T(Xn,Un,null),i(Pn,qn),i(Pn,Bn),i(Bn,Gn),Hn=!0,Rn||(Jn=[f($e,"click",t[26]),f(Se,"click",t[28]),f(Gn,"click",d(t[36]))],Rn=!0)},p(t,e){(!Hn||1&e[0])&&v(S,t[0]);const n={};!C&&1&e[0]&&(C=!0,n.value=t[0],z((()=>C=!1))),E.$set(n),(!Hn||2&e[0])&&v(Q,t[1]);const s={};!tt&&2&e[0]&&(tt=!0,s.value=t[1],z((()=>tt=!1))),Z.$set(s),(!Hn||4&e[0])&&v(ut,t[2]);const o={};!pt&&4&e[0]&&(pt=!0,o.value=t[2],z((()=>pt=!1))),dt.$set(o),(!Hn||8&e[0])&&v(bt,t[3]);const l={};!_t&&8&e[0]&&(_t=!0,l.value=t[3],z((()=>_t=!1))),St.$set(l),(!Hn||16&e[0])&&v(Ot,t[4]);const i={};!Pt&&16&e[0]&&(Pt=!0,i.value=t[4],z((()=>Pt=!1))),It.$set(i),(!Hn||32&e[0])&&v(Jt,t[5]),(!Hn||64&e[0])&&v(Vt,t[6]),(!Hn||128&e[0])&&v(te,t[7]),(!Hn||256&e[0])&&v(ne,t[8]),(!Hn||512&e[0])&&v(ve,t[9]);const a={};!be&&512&e[0]&&(be=!0,a.value=t[9],z((()=>be=!1))),we.$set(a),(!Hn||1024&e[0])&&v(De,t[10]);const r={};!Xe&&1024&e[0]&&(Xe=!0,r.value=t[10],z((()=>Xe=!1))),Ue.$set(r),(!Hn||2048&e[0])&&v(Qe,t[11]);const u={};!tn&&2048&e[0]&&(tn=!0,u.value=t[11],z((()=>tn=!1))),Ze.$set(u),(!Hn||4096&e[0])&&v(cn,t[12]);const c={};!vn&&4096&e[0]&&(vn=!0,c.value=t[12],z((()=>vn=!1))),pn.$set(c),(!Hn||8192&e[0])&&v(xn,t[13]);const f={};!Fn&&8192&e[0]&&(Fn=!0,f.value=t[13],z((()=>Fn=!1))),_n.$set(f),(!Hn||16384&e[0])&&v(jn,t[14]);const d={};!Yn&&16384&e[0]&&(Yn=!0,d.value=t[14],z((()=>Yn=!1))),Xn.$set(d)},i(t){Hn||(M(E.$$.fragment,t),M(Z.$$.fragment,t),M(dt.$$.fragment,t),M(St.$$.fragment,t),M(It.$$.fragment,t),M(le.$$.fragment,t),M(we.$$.fragment,t),M(Ue.$$.fragment,t),M(Ze.$$.fragment,t),M(pn.$$.fragment,t),M(_n.$$.fragment,t),M(Xn.$$.fragment,t),Hn=!0)},o(t){L(E.$$.fragment,t),L(Z.$$.fragment,t),L(dt.$$.fragment,t),L(St.$$.fragment,t),L(It.$$.fragment,t),L(le.$$.fragment,t),L(we.$$.fragment,t),L(Ue.$$.fragment,t),L(Ze.$$.fragment,t),L(pn.$$.fragment,t),L(_n.$$.fragment,t),L(Xn.$$.fragment,t),Hn=!1},d(t){t&&a(e),O(E),O(Z),O(dt),O(St),O(It),O(le),O(we),O(Ue),O(Ze),O(pn),O(_n),O(Xn),Rn=!1,s(Jn)}}}let Y=50;function q(t){return"$ "+t}function B(t){return t.replace("$","").trim()}function G(t){let e=Math.floor(t/60);return t%=60,e.toString().padStart(2,"0")+":"+t.toString().padStart(2,"0")}function H(t){let e=t.split(":"),n=parseInt(e[0]);n=Math.min(Math.max(n,0),23);let s=e[1]?parseInt(e[1]):0;return s=Math.min(Math.max(s,0),59),60*n+s}function R(t,e,n){let s=100,o=500,l=3.28,i=.5,a=.5,r=Y,u=Y,c=!1,f="",d=0,p=-2.5,v=100,m=720,g=1,h=100;return[s,o,l,i,a,r,u,c,f,d,p,v,m,g,h,{min:-5.5,max:5.5,step:1,keyStep:1,keyStepFast:2,decimals:1,speed:.04},function(t){s=t,n(0,s)},function(t){o=t,n(1,o)},function(t){l=t,n(2,l)},function(t){i=t,n(3,i)},function(t){a=t,n(4,a)},t=>{n(6,u=t.detail)},t=>{n(5,r=t.detail)},t=>{n(8,f=t.key),console.log(t)},t=>{n(7,c=!0),console.log(t)},t=>{n(7,c=!1),console.log(t)},()=>{n(9,d--,d)},function(t){d=t,n(9,d)},()=>{n(9,d++,d)},function(t){p=t,n(10,p)},function(t){v=t,n(11,v)},function(t){m=t,n(12,m)},t=>Math.pow(10,t).toFixed(1),t=>Math.log10(t),function(t){g=t,n(13,g)},function(t){h=t,n(14,h)},()=>alert("Form was submitted")]}return new class extends class{$destroy(){O(this,1),this.$destroy=t}$on(t,e){const n=this.$$.callbacks[t]||(this.$$.callbacks[t]=[]);return n.push(e),()=>{const t=n.indexOf(e);-1!==t&&n.splice(t,1)}}$set(t){var e;this.$$set&&(e=t,0!==Object.keys(e).length)&&(this.$$.skip_bound=!0,this.$$set(t),this.$$.skip_bound=!1)}}{constructor(t){super(),D(this,t,R,X,l,{},[-1,-1])}}({target:document.body})}();
//# sourceMappingURL=bundle.js.map
