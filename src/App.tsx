/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "@/src/components/layout/Layout";
import Dashboard from "@/src/pages/Dashboard";
import Templates from "@/src/pages/Templates";
import Generate from "@/src/pages/Generate";
import History from "@/src/pages/History";
import Login from "@/src/pages/Login";

export default function App() {
  const [user, setUser] = useState<any>(null);

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/templates" element={<Templates />} />
          <Route path="/generate" element={<Generate />} />
          <Route path="/history" element={<History />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

