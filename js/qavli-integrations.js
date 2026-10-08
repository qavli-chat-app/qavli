/* QAVLI Premium integrations
 * Cloudinary: unsigned browser uploads for media/files.
 * PostHog: optional privacy-aware product analytics when a public project key is configured.
 */
(function(){
  const cfg=window.QAVLI_CONFIG||{};
  const cloud=cfg.cloudinary||{};
  const ph=cfg.posthog||{};

  function cloudinaryReady(){
    return Boolean(cloud.cloudName && cloud.uploadPreset);
  }

  async function uploadToCloudinary(file, folder){
    if(!cloudinaryReady()) throw new Error("Cloudinary is not configured yet.");
    const endpoint="https://api.cloudinary.com/v1_1/"+encodeURIComponent(cloud.cloudName)+"/auto/upload";
    const body=new FormData();
    body.append("file",file);
    body.append("upload_preset",cloud.uploadPreset);
    if(folder) body.append("folder",folder);
    const res=await fetch(endpoint,{method:"POST",body});
    const data=await res.json().catch(()=>({}));
    if(!res.ok || !data.secure_url) throw new Error(data.error?.message||"Cloudinary upload failed.");
    return {
      url:data.secure_url,
      publicId:data.public_id||"",
      resourceType:data.resource_type||"",
      format:data.format||"",
      bytes:data.bytes||file.size,
      width:data.width||null,
      height:data.height||null
    };
  }

  function track(event,properties={}){
    try{
      if(window.posthog?.capture) window.posthog.capture(event,properties);
    }catch(_){}
  }

  function loadPostHog(){
    if(!ph.apiKey || window.posthog) return;
    const s=document.createElement("script");
    s.src="https://us-assets.i.posthog.com/static/array.js";
    s.async=true;
    s.onload=()=>{
      try{
        window.posthog.init(ph.apiKey,{api_host:ph.host||"https://us.i.posthog.com",capture_pageview:true,persistence:"localStorage"});
      }catch(_){}
    };
    document.head.appendChild(s);
  }

  window.QAVLIIntegrations=Object.freeze({
    cloudinaryReady,
    uploadToCloudinary,
    track,
    loadPostHog
  });

  loadPostHog();
})();
