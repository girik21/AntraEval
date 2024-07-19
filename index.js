const API = (() => {
  const URL = "http://localhost:3000";

  const getCart = () => {
    //Simple GET REQUEST for the cart
    const cartGetter = fetch(`${URL}/cart`).then(response => response.json());
    return cartGetter
  };

  const getInventory = () => {
    //Simple GET REQUEST for the Inventory
    const inventoryGetter = fetch(`${URL}/inventory`).then(response => response.json());
    return inventoryGetter
  };

  const addToCart = (inventoryItem) => {
    // POST REQUEST for the updating cart
    const adder = fetch(`${URL}/cart`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inventoryItem)
    }).then(response => response.json());

    return adder
  };

  const updateCart = (id, newAmount) => {
    // PATCH for the updating cart. I used patch bause PUT kept giving me undefined
    const updater = fetch(`${URL}/cart/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: newAmount })
    }).then(response => response.json());

    return updater
  };

  const deleteFromCart = (id) => {
    const deleter = fetch(`${URL}/cart/${id}`, {
      method: 'DELETE'
    }).then(response => response.json());

    return deleter
  };

  const checkout = () => {
    //no need to change
    return getCart().then((data) =>
      Promise.all(data.map((item) => deleteFromCart(item.id)))
    );
  };

  return {
    getCart,
    updateCart,
    getInventory,
    addToCart,
    deleteFromCart,
    checkout,
  };
})();

const Model = (() => {
  class State {
    #onChange;
    #inventory;
    #cart;

    constructor() {
      this.#inventory = [];
      this.#cart = [];
    }

    get cart() {
      return this.#cart;
    }

    get inventory() {
      return this.#inventory;
    }

    set cart(newCart) {
      this.#cart = newCart;
      this.#onChange();
    }

    set inventory(newInventory) {
      this.#inventory = newInventory;
      this.#onChange();
    }

    subscribe(cb) {
      this.#onChange = cb;
    }
  }

  return {
    State,
    ...API
  };
})();

const View = (() => {
  const renderInventory = (inventory) => {
    //update the DOM
    const inventoryList = document.querySelector('.inventory-list');
    inventoryList.innerHTML = inventory.map(item => `
      <li class="inventory-item" data-id="${item.id}">
        <span class="item-name">${item.content}</span>
        <button class="decrease-btn">-</button>
        <span class="item-quantity">0</span>
        <button class="increase-btn">+</button>
        <button class="add-to-cart-btn">add to cart</button>
      </li>
    `).join('');
  };

  const renderCart = (cart) => {
    //HElps to render all the span cart-item
    const cartList = document.querySelector('.cart-list');
    cartList.innerHTML = cart.map(item => `
      <li class="cart-item" data-id="${item.id}">
        <span class="item-name">${item.content} x ${item.amount}</span>
        <button class="delete-btn">delete</button>
      </li>
    `).join('');
  };

  return {
    renderInventory,
    renderCart,
  };
})();

const Controller = ((model, view) => {
  const state = new model.State();

  const init = () => {
    model.getInventory().then(inventory => {
      state.inventory = inventory;
    });

    model.getCart().then(cart => {
      state.cart = cart;
    });
  };

  const handleUpdateAmount = (id, newAmount) => {
    model.updateCart(id, newAmount).then(() => {
      model.getCart().then(cart => {
        state.cart = cart;
      });
    });
  };

  const handleAddToCart = (id, amount) => {
    if (amount <= 0) {
      console.log("Cannot add item with amount 0 or less to cart");
      return;
    }

    const item = state.inventory.find(item => item.id === id);
    if (item) {
      const cartItem = state.cart.find(cartItem => cartItem.id === id);
      if (cartItem) {
        handleUpdateAmount(id, cartItem.amount + amount);
      } else {
        model.addToCart({ id, content: item.content, amount }).then(() => {
          model.getCart().then(cart => {
            state.cart = cart;
          });
        });
      }
    }
  };

  const handleDelete = (id) => {
    model.deleteFromCart(id).then(() => {
      model.getCart().then(cart => {
        state.cart = cart;
      });
    });
  };

  const handleCheckout = () => {
    model.checkout().then(() => {
      model.getCart().then(cart => {
        state.cart = cart;
      });
    });
  };

  const bootstrap = () => {
    init();
    state.subscribe(() => {
      view.renderInventory(state.inventory);
      view.renderCart(state.cart);
    });

    document.addEventListener('click', event => {
      const target = event.target;
      if (target.classList.contains('decrease-btn')) {
        const itemEl = target.closest('.inventory-item');
        const quantityEl = itemEl.querySelector('.item-quantity');
        let quantity = parseInt(quantityEl.textContent);
        if (quantity > 0) quantityEl.textContent = --quantity;
      } else if (target.classList.contains('increase-btn')) {
        const itemEl = target.closest('.inventory-item');
        const quantityEl = itemEl.querySelector('.item-quantity');
        let quantity = parseInt(quantityEl.textContent);
        quantityEl.textContent = ++quantity;
      } else if (target.classList.contains('add-to-cart-btn')) {
        const itemEl = target.closest('.inventory-item');
        const id = parseInt(itemEl.dataset.id);
        const quantity = parseInt(itemEl.querySelector('.item-quantity').textContent);
        if (quantity > 0) {
          handleAddToCart(id, quantity);
        } else {
          console.log("Cannot add item with quantity 0 to cart");
        }
      } else if (target.classList.contains('delete-btn')) {
        const itemEl = target.closest('.cart-item');
        const id = parseInt(itemEl.dataset.id);
        handleDelete(id);
      } else if (target.classList.contains('checkout-btn')) {
        handleCheckout();
      }
    });
  };

  return {
    bootstrap,
  };
})(Model, View);

Controller.bootstrap();