import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface Foreman {id:string;firstName:string;lastName:string;phone:string;isActive:boolean}
export interface Work {id:string;name:string;description?:string;location?:string;startDate:string;estimatedEndDate:string;status:string;timeZone:string;closeTime:string;foremanId:string;foremanName:string}
export interface Goal {id:string;activityId:string;recurrenceId?:string;date:string;description:string;expectedQuantity:number;unit:string;customUnit?:string;isActive:boolean}
export interface ReportItem {id:string;goalId:string;activityId:string;description:string;expected:number;actual:number;unit:string;customUnit?:string}
export interface Report {id:string;workId:string;workName:string;date:string;foremanName:string;observations:string;submittedAt:string;updatedAt:string;items:ReportItem[];photos:{id:string}[];compliance:number|null}
export interface PublicToday {work:{id:string;name:string;foremanName:string};date:string;goals:Goal[];report:Report|null;editable:boolean;closeTime:string}

@Injectable({providedIn:'root'})
export class AuthStore {
  token = signal(sessionStorage.getItem('urba-token') ?? '');
  set(token:string) {sessionStorage.setItem('urba-token',token);this.token.set(token);}
  clear() {sessionStorage.removeItem('urba-token');this.token.set('');}
}

type InstallEvent = Event & {prompt:()=>Promise<void>};
@Injectable({providedIn:'root'})
export class InstallPromptStore {
  prompt = signal<InstallEvent|null>(null);
  constructor(){if(typeof window!=='undefined')window.addEventListener('beforeinstallprompt',(event:Event)=>{event.preventDefault();this.prompt.set(event as InstallEvent)})}
  async install(){const event=this.prompt();if(event){await event.prompt();this.prompt.set(null)}}
}

@Injectable({providedIn:'root'})
export class Api {
  private http = inject(HttpClient);
  private auth = inject(AuthStore);
  private headers() {return new HttpHeaders({Authorization:`Bearer ${this.auth.token()}`});}
  get<T>(path:string,publicAccess=false):Promise<T> {return firstValueFrom(this.http.get<T>(`/api/${path}`,{headers:publicAccess?undefined:this.headers()}));}
  post<T>(path:string,body:unknown,publicAccess=false):Promise<T> {return firstValueFrom(this.http.post<T>(`/api/${path}`,body,{headers:publicAccess?undefined:this.headers()}));}
  patch<T>(path:string,body:unknown):Promise<T> {return firstValueFrom(this.http.patch<T>(`/api/${path}`,body,{headers:this.headers()}));}
  delete<T>(path:string):Promise<T> {return firstValueFrom(this.http.delete<T>(`/api/${path}`,{headers:this.headers()}));}
  upload<T>(path:string,file:File,publicAccess=false):Promise<T> {const data=new FormData();data.append('photo',file);return firstValueFrom(this.http.post<T>(`/api/${path}`,data,{headers:publicAccess?undefined:this.headers()}));}
  photo(id:string):Promise<Blob> {return firstValueFrom(this.http.get(`/api/admin/photos/${id}`,{headers:this.headers(),responseType:'blob'}));}
}

export function message(error:unknown):string {
  if (error instanceof HttpErrorResponse) {
    if (error.status===0) return 'Sin conexión. Los datos no fueron enviados; podés intentarlo de nuevo.';
    if (error.status===401) return 'La sesión venció. Volvé a ingresar.';
    const value=error.error?.message;
    return Array.isArray(value) ? value.join('. ') : typeof value==='string' ? value : 'No se pudo completar la operación.';
  }
  return error instanceof Error ? error.message : 'Ocurrió un error inesperado.';
}

export const unitNames:Record<string,string>={UNIDADES:'unidades',METROS:'m',METROS_CUADRADOS:'m²',METROS_CUBICOS:'m³',KILOGRAMOS:'kg',HORAS:'h',PORCENTAJE:'%',OTRA:'otra'};
export const unitOptions=Object.entries(unitNames).map(([value,label])=>({value,label}));
export const quantity=(value:unknown)=>Number(value||0);
export function localDate(timeZone='America/Argentina/Buenos_Aires') {
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const part=(type:string)=>parts.find(x=>x.type===type)?.value||'';
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function reportText(report:Report):string {
  const lines=[`INFORME DIARIO — ${report.workName}`,`Fecha: ${report.date}`,`Capataz: ${report.foremanName}`,'','OBJETIVOS:'];
  for (const item of report.items) lines.push(`• ${item.description}: ${quantity(item.actual)}/${quantity(item.expected)} ${item.customUnit||unitNames[item.unit]||item.unit} — ${Math.round(quantity(item.actual)/quantity(item.expected)*100)}%`);
  lines.push('',`Cumplimiento general: ${report.compliance===null?'Sin objetivos':report.compliance+'%'}`,'',`OBSERVACIONES: ${report.observations||'Sin observaciones'}`,'',`ESTADO: ${report.compliance===null?'SIN OBJETIVOS':report.compliance>=100?'CUMPLIDO':'CUMPLIMIENTO PARCIAL'}`);
  return lines.join('\n');
}
export async function share(report:Report) {
  const text=reportText(report);
  if (navigator.share) {try {await navigator.share({text});return;} catch (error) {if ((error as DOMException).name==='AbortError') return;}}
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`,'_blank','noopener,noreferrer');
}
