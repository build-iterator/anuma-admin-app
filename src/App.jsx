import { BrowserRouter } from "react-router";
import { Provider } from "react-redux";

import { store } from "@/api/store";
import Router from "@/routes";

function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <Router />
      </BrowserRouter>
    </Provider>
  );
}

export default App;
