import { Routes, Route } from "react-router-dom";

function Home() {
  return <h1>Home</h1>;
}

function Login() {
  return <h1>Login</h1>;
}

function Register() {
  return <h1>Cadastro</h1>;
}

function TypingTest() {
  return <h1>Teste de Digitação</h1>;
}

function Profile() {
  return <h1>Perfil</h1>;
}

function Ranking() {
  return <h1>Ranking</h1>;
}

function Battle() {
  return <h1>Battle</h1>;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/typing" element={<TypingTest />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/ranking" element={<Ranking />} />
      <Route path="/battle" element={<Battle />} />
    </Routes>
  );
}
