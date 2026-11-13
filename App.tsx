// The app shell: the four pages behind the system tab bar, and the deep links that switch them.
import { mount, platform, UrlScheme, View } from "nsh";
import { TabBar } from "nsh/mobile";
import { Categories } from "./pages/Categories";
import { Home } from "./pages/Home";
import { Settings } from "./pages/Settings";
import { Tasks } from "./pages/Tasks";
import { currentTab, setTab, type Tab, TABS } from "./store";

// SF Symbols on iOS; the system's own drawables on Android (the app ships none).
const ICONS = {
  home: platform.select({ ios: "house", android: "android:ic_menu_today", default: null }),
  tasks: platform.select({ ios: "checkmark.circle", android: "android:ic_menu_agenda", default: null }),
  categories: platform.select({ ios: "list.bullet", android: "android:ic_menu_sort_by_size", default: null }),
  settings: platform.select({ ios: "gearshape", android: "android:ic_menu_preferences", default: null }),
};
const TITLES: Record<Tab, string> = { home: "Home", tasks: "Tasks", categories: "Categories", settings: "Settings" };

function App() {
  // `nshtodo://tasks` opens a tab: also how the headless tests switch tabs, which have no tab bar to press.
  UrlScheme.on("open", ({ url }) => {
    const target = TABS.find((t) => url === `nshtodo://${t}`);
    if (target) setTab(target);
  });
  return (
    <View class="flex-1 bg-background">
      <View class="flex-1 pt-[env(safe-area-inset-top)]">
        <If when={currentTab() === "home"}>
          <Home />
        </If>
        <If when={currentTab() === "tasks"}>
          <Tasks />
        </If>
        <If when={currentTab() === "categories"}>
          <Categories />
        </If>
        <If when={currentTab() === "settings"}>
          <Settings />
        </If>
      </View>
      <TabBar
        items={TABS.map((t) => ({ title: TITLES[t], icon: ICONS[t] }))}
        selectedIndex={TABS.indexOf(currentTab())}
        onChange={({ index }) => setTab(TABS[index])}
      />
    </View>
  );
}

mount(App);
