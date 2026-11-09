export type Role = 'admin' | 'agent' | 'user';

export class User {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly email: string,
    public readonly role: Role,
  ) {}
  get isAdmin(): boolean { return this.role === 'admin'; }
  get isAgent(): boolean { return this.role === 'agent'; }
  get roleLabel(): string { return this.role === 'admin' ? 'Administrador' : this.role === 'agent' ? 'Agente de atencion' : 'Usuario'; }
  static fromJson(j: any): User {
    const role: Role = j.role === 'admin' ? 'admin' : j.role === 'agent' ? 'agent' : 'user';
    return new User(j.id, j.name, j.email, role);
  }
}
