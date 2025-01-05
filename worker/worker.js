var e={d:(n,t)=>{for(var s in t)e.o(t,s)&&!e.o(n,s)&&Object.defineProperty(n,s,{enumerable:!0,get:t[s]})},o:(e,n)=>Object.prototype.hasOwnProperty.call(e,n)},n={};e.d(n,{A:()=>s});const t={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET, POST, OPTIONS","Access-Control-Allow-Headers":"Content-Type"},s={async fetch(e,n){if("OPTIONS"===e.method)return new Response(null,{headers:t});try{const s=new URL(e.url).pathname;if(await n.DB.exec("\nCREATE TABLE IF NOT EXISTS sync_groups (\n  id TEXT PRIMARY KEY,\n  created_at INTEGER NOT NULL,\n  last_updated INTEGER NOT NULL\n);\n\nCREATE TABLE IF NOT EXISTS devices (\n  id TEXT PRIMARY KEY,\n  sync_group_id TEXT NOT NULL,\n  last_sync INTEGER NOT NULL,\n  FOREIGN KEY(sync_group_id) REFERENCES sync_groups(id)\n);\n"),"POST"===e.method){if("/api/sync"===s)return await async function(e,n){const{groupId:s,deviceId:a,data:r,timestamp:i}=await e.json();if(!await n.DB.prepare("SELECT * FROM sync_groups WHERE id = ?").bind(s).first())return new Response(JSON.stringify({error:"Group not found"}),{status:404,headers:{...t,"Content-Type":"application/json"}});const o=`${s}/${i}.json`;return await n.SYNC_BUCKET.put(o,JSON.stringify(r)),await n.SYNC_KV.put(`${s}:latest`,i.toString()),await n.DB.prepare("INSERT OR REPLACE INTO devices (id, sync_group_id, last_sync) VALUES (?, ?, ?)").bind(a,s,i).run(),await n.DB.prepare("UPDATE sync_groups SET last_updated = ? WHERE id = ?").bind(i,s).run(),new Response(JSON.stringify({success:!0}),{headers:{...t,"Content-Type":"application/json"}})}(e,n);if("/api/create-group"===s)return await async function(e,n){const{deviceId:s}=await e.json(),a=crypto.randomUUID(),r=Date.now();return await n.DB.prepare("INSERT INTO sync_groups (id, created_at, last_updated) VALUES (?, ?, ?)").bind(a,r,r).run(),await n.DB.prepare("INSERT INTO devices (id, sync_group_id, last_sync) VALUES (?, ?, ?)").bind(s,a,r).run(),new Response(JSON.stringify({groupId:a}),{headers:{...t,"Content-Type":"application/json"}})}(e,n)}return"GET"===e.method&&"/api/get-updates"===s?await async function(e,n){const s=new URL(e.url),a=s.searchParams.get("groupId"),r=s.searchParams.get("deviceId"),i=parseInt(s.searchParams.get("since")||"0");if(!await n.DB.prepare("SELECT * FROM devices WHERE id = ? AND sync_group_id = ?").bind(r,a).first())return new Response(JSON.stringify({error:"Device not found in group"}),{status:404,headers:{...t,"Content-Type":"application/json"}});const o=await n.SYNC_KV.get(`${a}:latest`);if(!o||parseInt(o)<=i)return new Response(JSON.stringify({updates:[]}),{headers:{...t,"Content-Type":"application/json"}});const p=await n.SYNC_BUCKET.list({prefix:`${a}/`,cursor:`${a}/${i}`}),c=await Promise.all(p.objects.filter((e=>parseInt(e.key.split("/")[1])>i)).map((async e=>{const t=await n.SYNC_BUCKET.get(e.key);return JSON.parse(await t.text())})));return new Response(JSON.stringify({updates:c}),{headers:{...t,"Content-Type":"application/json"}})}(e,n):new Response("Not Found",{status:404,headers:t})}catch(e){return new Response(JSON.stringify({error:e.message}),{status:500,headers:{...t,"Content-Type":"application/json"}})}}};var a=n.A;export{a as default};