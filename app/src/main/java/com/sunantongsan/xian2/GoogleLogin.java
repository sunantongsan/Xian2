package com.sunantongsan.xian2;
import android.app.Activity;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.webkit.WebView;
import android.widget.Toast;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import java.util.Collections;
import org.json.JSONObject;
/** Retains the in-flight PKCE callback across activity/process recreation. */
final class GoogleLogin {
 private final Activity activity; private final SharedPreferences state; private WebView web; private boolean ready,delivering;
 GoogleLogin(Activity activity){this.activity=activity;state=activity.getSharedPreferences("google-pending",0);}
 void attach(WebView view){web=view;ready=false;delivering=false;if(!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER))return;
  WebViewCompat.addWebMessageListener(view,"CockroAuth",Collections.singleton("https://appassets.androidplatform.net"),(v,message,origin,mainFrame,reply)->{
   if(!mainFrame||!"https://appassets.androidplatform.net".equals(origin.toString()))return;
   try{JSONObject msg=new JSONObject(message.getData());String action=msg.optString("action");
    if("exit".equals(action)){activity.finishAndRemoveTask();return;}
    if("awaitEmail".equals(action)){state.edit().clear().putLong("until",System.currentTimeMillis()+900000).commit();return;}
    if("ready".equals(action)){ready=true;resume();return;}
    Uri uri=Uri.parse(msg.getString("url"));
    if(!"https".equals(uri.getScheme())||!"kfohckvypopaoogmnjuy.supabase.co".equals(uri.getHost())||!"/auth/v1/authorize".equals(uri.getPath())||!"google".equals(uri.getQueryParameter("provider"))||!"cockronetwork://auth/callback".equals(uri.getQueryParameter("redirect_to"))||!"s256".equals(uri.getQueryParameter("code_challenge_method"))||uri.getQueryParameter("code_challenge")==null)return;
    state.edit().clear().putLong("until",System.currentTimeMillis()+300000).commit();
    activity.startActivity(new Intent(Intent.ACTION_VIEW,uri));
   }catch(Exception e){Toast.makeText(activity,"เปิด Google Login ไม่สำเร็จ",Toast.LENGTH_LONG).show();}
  });
 }
 void callback(Intent intent){Uri u=intent==null?null:intent.getData();if(u==null||!"cockronetwork".equals(u.getScheme())||!"auth".equals(u.getHost())||!"/callback".equals(u.getPath()))return;
  intent.setData(null);long until=state.getLong("until",0);
  if(System.currentTimeMillis()>until){state.edit().clear().commit();Toast.makeText(activity,"การเข้าสู่ระบบหมดเวลา กรุณาลองใหม่",Toast.LENGTH_LONG).show();return;}
  String code=u.getQueryParameter("code");
  if(code==null||!code.matches("[A-Za-z0-9_-]{8,2048}")){state.edit().putString("error","auth_cancelled").commit();}else state.edit().putString("code",code).remove("error").commit();
  resume();
 }
 void resume(){if(web==null||!ready||delivering)return;String code=state.getString("code",null),error=state.getString("error",null);if(code==null&&error==null)return;
  if(System.currentTimeMillis()>state.getLong("until",0)){state.edit().clear().commit();return;}
  delivering=true;String detail=code!=null?"{code:"+JSONObject.quote(code)+"}":"{error:"+JSONObject.quote(error)+"}";
  // JS synchronously journals the callback before returning true. Keep native copy until acknowledged.
  web.evaluateJavascript("window.cockroReceiveGoogle?window.cockroReceiveGoogle("+detail+"):false",value->{delivering=false;if("true".equals(value))state.edit().clear().commit();});
 }
}

