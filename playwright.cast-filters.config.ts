import config from './playwright.config';
import {defineConfig} from '@playwright/test';
export default defineConfig({...config,webServer:config.webServer&&!Array.isArray(config.webServer)?{...config.webServer,reuseExistingServer:true}:config.webServer});
