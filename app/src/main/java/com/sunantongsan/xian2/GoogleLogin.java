package com.sunantongsan.xian2;
import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.webkit.WebView;
import android.widget.Toast;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import java.util.Collections;
import org.json.JSONObject;
/** Uses the existing Cockro Supabase Google provider with external-browser PKCE. */
final class GoogleLogin {
 private final Activity activity;private WebView web;private long pendingUntil;private String pendingCode;
 GoogleLogin(Activity activity){this.activity=activity;}
 void attach(WebView view){web=view;if(!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER))return;
  WebViewCompat.addWebMessageListener(view,"CockroAuth",Collections.singleton("https://appassets.androidplatform.net"),(v,message,origin,mainFrame,reply)->{
   if(!mainFrame||!"https://appassets.androidplatform.net".equals(origin.toString()))return;
   try{Uri uri=Uri.parse(new JSONObject(message.getData()).getString("url"));
    if(!"https".equals(uri.getScheme())||!"kfohckvypopaoogmnjuy.supabase.co".equals(uri.getHost())||!"/auth/v1/authorize".equals(uri.getPath())||!"google".equals(uri.getQueryParameter("provider"))||!"cockronetwork://auth/callback".equals(uri.getQueryParameter("redirect_to"))||!"s256".equals(uri.getQueryParameter("code_challenge_method"))||uri.getQueryParameter("code_challenge")==null)return;
    pendingUntil=System.currentTimeMillis()+300000;activity.startActivity(new Intent(Intent.ACTION_VIEW,uri));
   }catch(Exception e){Toast.makeText(activity,"เปิด Google Login ไม่สำเร็จ",Toast.LENGTH_LONG).show();}
  });
 }
 void callback(Intent intent){Uri u=intent==null?null:intent.getData();if(u==null||!"cockronetwork".equals(u.getScheme())||!"auth".equals(u.getHost())||!"/callback".equals(u.getPath())||System.currentTimeMillis()>pendingUntil)return;
  String code=u.getQueryParameter("code");if(code==null||!code.matches("[A-Za-z0-9_-]{8,2048}")){Toast.makeText(activity,"ยกเลิกหรือเข้าสู่ระบบไม่สำเร็จ",Toast.LENGTH_LONG).show();return;}pendingUntil=0;pendingCode=code;intent.setData(null);
 }
 void resume(){if(web==null||pendingCode==null)return;String code=pendingCode;pendingCode=null;web.evaluateJavascript("window.dispatchEvent(new CustomEvent('cockro-google-callback',{detail:{code:"+JSONObject.quote(code)+"}}));",null);}
}
