// The app shell: the five pages behind the tabs, and the deep links that switch them. iOS and Android
// have the system tab bar; the desktops and the web have none, so `Tabs` draws a sidebar (a bottom
// bar in the web's phone idiom).
import { mount, platform, signal, Text, UrlScheme, View } from "nsh";
import { Tab, Tabs } from "nsh/base";
import { TabBar } from "nsh/mobile";
import { Categories } from "./pages/Categories";
import { Home } from "./pages/Home";
import { Market } from "./pages/Market";
import { Onboarding } from "./pages/Onboarding";
import { Settings } from "./pages/Settings";
import { Tasks } from "./pages/Tasks";
import { Icon, type IconName } from "./ui/icon";
import { Splash } from "./ui/splash";
import { currentTab, finishOnboarding, isReady, onboardingVisible, setTab, type Tab as TabName, TABS } from "./store";

// SF Symbols on iOS; the system's own drawables on Android (the app ships none).
const ICONS = {
  home: platform.select({ ios: "house", android: "android:ic_menu_today", default: null }),
  tasks: platform.select({ ios: "checkmark.circle", android: "android:ic_menu_agenda", default: null }),
  categories: platform.select({ ios: "list.bullet", android: "android:ic_menu_sort_by_size", default: null }),
  market: platform.select({ ios: "chart.xyaxis.line", android: "android:ic_menu_view", default: null }),
  settings: platform.select({ ios: "gearshape", android: "android:ic_menu_preferences", default: null }),
};
const TITLES: Record<TabName, string> = { home: "Home", tasks: "Tasks", categories: "Categories", market: "Market", settings: "Settings" };

const NATIVE_BAR = platform.os === "ios" || platform.os === "android";
const SIDEBAR = platform.desktop;
const GLYPHS: Record<TabName, IconName> = { home: "home", tasks: "check", categories: "list", market: "chart", settings: "settings" };

function Nav() {
  return (
    <Tabs
      class={SIDEBAR ? "w-48 flex-col gap-1 border-r border-border p-3 pt-[env(safe-area-inset-top)]" : "flex-row border-t border-border p-1"}
      indicatorClass={SIDEBAR ? "inset-x-3 rounded-full bg-primary/15" : "inset-y-1 mx-1 rounded-full bg-primary/15"}
    >
      {TABS.map((t) => (
        <Tab
          testID={`tab-${t}`}
          accessibilityLabel={TITLES[t]}
          selected={currentTab() === t}
          onPress={() => setTab(t)}
          class={SIDEBAR ? "flex-row items-center gap-3 px-4 py-3" : "flex-1 flex-row items-center justify-center gap-2 py-3"}
        >
          <Icon name={GLYPHS[t]} color={currentTab() === t ? "primary" : "muted-foreground"} />
          <Text class={currentTab() === t ? "font-semibold text-primary" : "text-muted-foreground"}>{TITLES[t]}</Text>
        </Tab>
      ))}
    </Tabs>
  );
}

function Shell() {
  return (
    <View class={SIDEBAR ? "flex-1 flex-row bg-background" : "flex-1 bg-background"}>
      <If when={SIDEBAR}>
        <Nav />
      </If>
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
        <If when={currentTab() === "market"}>
          <Market />
        </If>
        <If when={currentTab() === "settings"}>
          <Settings />
        </If>
      </View>
      <If when={NATIVE_BAR}>
        <TabBar
          items={TABS.map((t) => ({ title: TITLES[t], icon: ICONS[t] }))}
          selectedIndex={TABS.indexOf(currentTab())}
          onChange={({ index }) => setTab(TABS[index])}
        />
      </If>
      <If when={!NATIVE_BAR && !SIDEBAR}>
        <Nav />
      </If>
    </View>
  );
}

function App() {
  // `nshtodo://tasks` opens a tab: also how the headless tests switch tabs, which have no tab bar to press.
  UrlScheme.on("open", ({ url }) => {
    const target = TABS.find((t) => url === `nshtodo://${t}`);
    if (target) setTab(target);
  });
  // The splash covers everything until the saved data is read and its animation has played. The pages
  // mount when it starts to fade, so the first launch never flashes the tabs and the onboarding is never skipped past.
  const phase = signal<"splash" | "fading" | "done">("splash");
  return (
    <View class="flex-1 bg-background">
      <If when={phase() !== "splash"}>
        <If when={onboardingVisible()} else={<Shell />}>
          <Onboarding onDone={finishOnboarding} />
        </If>
      </If>
      <If when={phase() !== "done"}>
        <Splash ready={isReady} onReveal={() => phase.set("fading")} onDone={() => phase.set("done")} />
      </If>
    </View>
  );
}

mount(App);
