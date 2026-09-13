package com.zekraram.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // دور هشتم / مورد ۴ — must be registered BEFORE super.onCreate(), which
        // is when the bridge builds its plugin registry.
        registerPlugin(SaveImagePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
