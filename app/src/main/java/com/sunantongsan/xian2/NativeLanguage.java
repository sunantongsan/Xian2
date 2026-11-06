package com.sunantongsan.xian2;

import android.content.Context;
import android.webkit.JavascriptInterface;

/** Presentation preference only. Account authentication remains on the game server. */
public final class NativeLanguage {
 private final Context context;
 public NativeLanguage(Context context){this.context=context.getApplicationContext();}
 @JavascriptInterface public void setLanguage(String value){
  if("th".equals(value)||"en".equals(value))context.getSharedPreferences("cockro-language",Context.MODE_PRIVATE).edit().putString("current",value).apply();
 }
 static String text(Context context,String thai,String english){
  String locale=context.getResources().getConfiguration().getLocales().get(0).getLanguage();
  String selected=context.getSharedPreferences("cockro-language",Context.MODE_PRIVATE).getString("current",locale);
  return "th".equals(selected)?thai:english;
 }
}
