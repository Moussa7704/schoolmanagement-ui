"use client";

import { App } from "antd";

// AntD's static `message.xxx()` can't read the ConfigProvider theme context
// (see https://u.ant.design/v5-for-19 "static-function"). This hook returns
// the context-aware instance from the `<App>` wrapper in the root layout.
export const useMessage = () => App.useApp().message;
