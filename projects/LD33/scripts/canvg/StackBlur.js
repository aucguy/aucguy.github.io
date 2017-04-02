/*

StackBlur - a fast almost Gaussian Blur For Canvas

Version: 	0.5
Author:		Mario Klingemann
Contact: 	mario@quasimondo.com
Website:	http://www.quasimondo.com/StackBlurForCanvas
Twitter:	@quasimondo

In case you find this class useful - especially in commercial projects -
I am not totally unhappy for a small donation to my PayPal account
mario@quasimondo.de

Or support me on flattr: 
https://flattr.com/thing/72791/StackBlur-a-fast-almost-Gaussian-Blur-Effect-for-CanvasJavascript

Copyright (c) 2010 Mario Klingemann

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
*/
!function(e){function t(e){for(var t=e.data,a=e.width*e.height*4,r=0;a>r;r+=4){var n=t[r+3]/255;t[r]*=n,t[r+1]*=n,t[r+2]*=n}}function a(e){for(var t=e.data,a=e.width*e.height*4,r=0;a>r;r+=4){var n=t[r+3];0!=n&&(n=255/n,t[r]*=n,t[r+1]*=n,t[r+2]*=n)}}function r(e,t,a,r){var i=document.getElementById(e),g=i.naturalWidth,c=i.naturalHeight,l=document.getElementById(t);l.style.width=g+"px",l.style.height=c+"px",l.width=g,l.height=c;var d=l.getContext("2d");d.clearRect(0,0,g,c),d.drawImage(i,0,0),isNaN(a)||1>a||(r?n(t,0,0,g,c,a):o(t,0,0,g,c,a))}function n(e,r,n,o,l,d){if(!(isNaN(d)||1>d)){d|=0;var f,s=document.getElementById(e),u=s.getContext("2d");try{try{f=u.getImageData(r,n,o,l)}catch(h){try{netscape.security.PrivilegeManager.enablePrivilege("UniversalBrowserRead"),f=u.getImageData(r,n,o,l)}catch(h){throw alert("Cannot access local image"),new Error("unable to access local image data: "+h)}}}catch(h){throw alert("Cannot access image"),new Error("unable to access image data: "+h)}t(f);var m,x,b,v,w,y,p,I,B,E,C,D,N,R,P,G,M,U,k,A,H,W,j,q,z=f.data,F=d+d+1,J=o-1,K=l-1,L=d+1,O=L*(L+1)/2,Q=new i,S=Q;for(b=1;F>b;b++)if(S=S.next=new i,b==L)var T=S;S.next=Q;var V=null,X=null;p=y=0;var Y=g[d],Z=c[d];for(x=0;l>x;x++){for(G=M=U=k=I=B=E=C=0,D=L*(A=z[y]),N=L*(H=z[y+1]),R=L*(W=z[y+2]),P=L*(j=z[y+3]),I+=O*A,B+=O*H,E+=O*W,C+=O*j,S=Q,b=0;L>b;b++)S.r=A,S.g=H,S.b=W,S.a=j,S=S.next;for(b=1;L>b;b++)v=y+((b>J?J:b)<<2),I+=(S.r=A=z[v])*(q=L-b),B+=(S.g=H=z[v+1])*q,E+=(S.b=W=z[v+2])*q,C+=(S.a=j=z[v+3])*q,G+=A,M+=H,U+=W,k+=j,S=S.next;for(V=Q,X=T,m=0;o>m;m++)z[y]=I*Y>>Z,z[y+1]=B*Y>>Z,z[y+2]=E*Y>>Z,z[y+3]=C*Y>>Z,I-=D,B-=N,E-=R,C-=P,D-=V.r,N-=V.g,R-=V.b,P-=V.a,v=p+((v=m+d+1)<J?v:J)<<2,G+=V.r=z[v],M+=V.g=z[v+1],U+=V.b=z[v+2],k+=V.a=z[v+3],I+=G,B+=M,E+=U,C+=k,V=V.next,D+=A=X.r,N+=H=X.g,R+=W=X.b,P+=j=X.a,G-=A,M-=H,U-=W,k-=j,X=X.next,y+=4;p+=o}for(m=0;o>m;m++){for(M=U=k=G=B=E=C=I=0,y=m<<2,D=L*(A=z[y]),N=L*(H=z[y+1]),R=L*(W=z[y+2]),P=L*(j=z[y+3]),I+=O*A,B+=O*H,E+=O*W,C+=O*j,S=Q,b=0;L>b;b++)S.r=A,S.g=H,S.b=W,S.a=j,S=S.next;for(w=o,b=1;d>=b;b++)y=w+m<<2,I+=(S.r=A=z[y])*(q=L-b),B+=(S.g=H=z[y+1])*q,E+=(S.b=W=z[y+2])*q,C+=(S.a=j=z[y+3])*q,G+=A,M+=H,U+=W,k+=j,S=S.next,K>b&&(w+=o);for(y=m,V=Q,X=T,x=0;l>x;x++)v=y<<2,z[v]=I*Y>>Z,z[v+1]=B*Y>>Z,z[v+2]=E*Y>>Z,z[v+3]=C*Y>>Z,I-=D,B-=N,E-=R,C-=P,D-=V.r,N-=V.g,R-=V.b,P-=V.a,v=m+((v=x+L)<K?v:K)*o<<2,I+=G+=V.r=z[v],B+=M+=V.g=z[v+1],E+=U+=V.b=z[v+2],C+=k+=V.a=z[v+3],V=V.next,D+=A=X.r,N+=H=X.g,R+=W=X.b,P+=j=X.a,G-=A,M-=H,U-=W,k-=j,X=X.next,y+=o}a(f),u.putImageData(f,r,n)}}function o(e,t,a,r,n,o){if(!(isNaN(o)||1>o)){o|=0;var l,d=document.getElementById(e),f=d.getContext("2d");try{try{l=f.getImageData(t,a,r,n)}catch(s){try{netscape.security.PrivilegeManager.enablePrivilege("UniversalBrowserRead"),l=f.getImageData(t,a,r,n)}catch(s){throw alert("Cannot access local image"),new Error("unable to access local image data: "+s)}}}catch(s){throw alert("Cannot access image"),new Error("unable to access image data: "+s)}var u,h,m,x,b,v,w,y,p,I,B,E,C,D,N,R,P,G,M,U,k=l.data,A=o+o+1,H=r-1,W=n-1,j=o+1,q=j*(j+1)/2,z=new i,F=z;for(m=1;A>m;m++)if(F=F.next=new i,m==j)var J=F;F.next=z;var K=null,L=null;w=v=0;var O=g[o],Q=c[o];for(h=0;n>h;h++){for(D=N=R=y=p=I=0,B=j*(P=k[v]),E=j*(G=k[v+1]),C=j*(M=k[v+2]),y+=q*P,p+=q*G,I+=q*M,F=z,m=0;j>m;m++)F.r=P,F.g=G,F.b=M,F=F.next;for(m=1;j>m;m++)x=v+((m>H?H:m)<<2),y+=(F.r=P=k[x])*(U=j-m),p+=(F.g=G=k[x+1])*U,I+=(F.b=M=k[x+2])*U,D+=P,N+=G,R+=M,F=F.next;for(K=z,L=J,u=0;r>u;u++)k[v]=y*O>>Q,k[v+1]=p*O>>Q,k[v+2]=I*O>>Q,y-=B,p-=E,I-=C,B-=K.r,E-=K.g,C-=K.b,x=w+((x=u+o+1)<H?x:H)<<2,D+=K.r=k[x],N+=K.g=k[x+1],R+=K.b=k[x+2],y+=D,p+=N,I+=R,K=K.next,B+=P=L.r,E+=G=L.g,C+=M=L.b,D-=P,N-=G,R-=M,L=L.next,v+=4;w+=r}for(u=0;r>u;u++){for(N=R=D=p=I=y=0,v=u<<2,B=j*(P=k[v]),E=j*(G=k[v+1]),C=j*(M=k[v+2]),y+=q*P,p+=q*G,I+=q*M,F=z,m=0;j>m;m++)F.r=P,F.g=G,F.b=M,F=F.next;for(b=r,m=1;o>=m;m++)v=b+u<<2,y+=(F.r=P=k[v])*(U=j-m),p+=(F.g=G=k[v+1])*U,I+=(F.b=M=k[v+2])*U,D+=P,N+=G,R+=M,F=F.next,W>m&&(b+=r);for(v=u,K=z,L=J,h=0;n>h;h++)x=v<<2,k[x]=y*O>>Q,k[x+1]=p*O>>Q,k[x+2]=I*O>>Q,y-=B,p-=E,I-=C,B-=K.r,E-=K.g,C-=K.b,x=u+((x=h+j)<W?x:W)*r<<2,y+=D+=K.r=k[x],p+=N+=K.g=k[x+1],I+=R+=K.b=k[x+2],K=K.next,B+=P=L.r,E+=G=L.g,C+=M=L.b,D-=P,N-=G,R-=M,L=L.next,v+=r}f.putImageData(l,t,a)}}function i(){this.r=0,this.g=0,this.b=0,this.a=0,this.next=null}var g=[512,512,456,512,328,456,335,512,405,328,271,456,388,335,292,512,454,405,364,328,298,271,496,456,420,388,360,335,312,292,273,512,482,454,428,405,383,364,345,328,312,298,284,271,259,496,475,456,437,420,404,388,374,360,347,335,323,312,302,292,282,273,265,512,497,482,468,454,441,428,417,405,394,383,373,364,354,345,337,328,320,312,305,298,291,284,278,271,265,259,507,496,485,475,465,456,446,437,428,420,412,404,396,388,381,374,367,360,354,347,341,335,329,323,318,312,307,302,297,292,287,282,278,273,269,265,261,512,505,497,489,482,475,468,461,454,447,441,435,428,422,417,411,405,399,394,389,383,378,373,368,364,359,354,350,345,341,337,332,328,324,320,316,312,309,305,301,298,294,291,287,284,281,278,274,271,268,265,262,259,257,507,501,496,491,485,480,475,470,465,460,456,451,446,442,437,433,428,424,420,416,412,408,404,400,396,392,388,385,381,377,374,370,367,363,360,357,354,350,347,344,341,338,335,332,329,326,323,320,318,315,312,310,307,304,302,299,297,294,292,289,287,285,282,280,278,275,273,271,269,267,265,263,261,259],c=[9,11,12,13,13,14,14,15,15,15,15,16,16,16,16,17,17,17,17,17,17,17,18,18,18,18,18,18,18,18,18,19,19,19,19,19,19,19,19,19,19,19,19,19,19,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,20,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,21,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,22,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,23,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24,24],l={image:r,canvasRGBA:n,canvasRGB:o};"undefined"!=typeof define&&define.amd?define(function(){return l}):"undefined"!=typeof module&&module.exports&&(module.exports=l),e.stackBlur=l}("undefined"!=typeof window?window:this);