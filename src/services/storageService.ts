import fs from 'fs';
import path from 'path';
import { UserData } from '../types';

class StorageService {
  private dataPath: string;
  private users: Map<number, UserData>;

  constructor(dataPath: string) {
    this.dataPath = dataPath;
    this.users = new Map();
    this.loadData();
  }

  private loadData(): void {
    try {
      const dir = path.dirname(this.dataPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (fs.existsSync(this.dataPath)) {
        const data = fs.readFileSync(this.dataPath, 'utf-8');
        const usersArray: UserData[] = JSON.parse(data);
        usersArray.forEach(user => {
          this.users.set(user.userId, user);
        });
        console.log(`Loaded ${this.users.size} users from storage`);
      } else {
        this.saveData();
      }
    } catch (error) {
      console.error('Error loading data:', error);
      this.users = new Map();
    }
  }

  private saveData(): void {
    try {
      const usersArray = Array.from(this.users.values());
      fs.writeFileSync(this.dataPath, JSON.stringify(usersArray, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }

  getUser(userId: number): UserData | undefined {
    return this.users.get(userId);
  }

  createUser(userId: number, username?: string): UserData {
    const user: UserData = {
      userId,
      username,
      ingredients: [],
      lastActivity: new Date().toISOString(),
    };
    this.users.set(userId, user);
    this.saveData();
    return user;
  }

  updateUser(userId: number, updates: Partial<UserData>): UserData {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }
    const updatedUser = { ...user, ...updates, lastActivity: new Date().toISOString() };
    this.users.set(userId, updatedUser);
    this.saveData();
    return updatedUser;
  }

  addIngredient(userId: number, ingredient: string): UserData {
    const user = this.getUser(userId) || this.createUser(userId);
    const normalizedIngredient = ingredient.trim().toLowerCase();
    
    if (!user.ingredients.map(i => i.toLowerCase()).includes(normalizedIngredient)) {
      user.ingredients.push(ingredient.trim());
      return this.updateUser(userId, { ingredients: user.ingredients });
    }
    return user;
  }

  removeIngredient(userId: number, ingredient: string): UserData {
    const user = this.getUser(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }
    const normalizedIngredient = ingredient.trim().toLowerCase();
    user.ingredients = user.ingredients.filter(
      i => i.toLowerCase() !== normalizedIngredient
    );
    return this.updateUser(userId, { ingredients: user.ingredients });
  }

  clearIngredients(userId: number): UserData {
    const user = this.getUser(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }
    return this.updateUser(userId, { ingredients: [] });
  }

  getIngredients(userId: number): string[] {
    const user = this.getUser(userId);
    return user ? user.ingredients : [];
  }
}

export default StorageService;
