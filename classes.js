const gravity = 0.7

export class Sprite {
  constructor({ position, velocity, color = 'red', offset, isPlayer = false }) {
    this.position = position
    this.velocity = velocity
    this.width = 50
    this.height = 150
    this.color = color
    this.isPlayer = isPlayer
  }

  draw(c) {
    // Handled in Fighter
  }

  update(c, canvasHeight) {
    this.draw(c)
    this.position.x += this.velocity.x
    this.position.y += this.velocity.y

    if (this.position.y + this.height + this.velocity.y >= canvasHeight - 96) {
      this.velocity.y = 0
      this.position.y = canvasHeight - 96 - this.height
    } else {
      this.velocity.y += gravity
    }
  }
}

export class Fighter extends Sprite {
  constructor({ position, velocity, color = 'red', offset, isPlayer = false }) {
    super({ position, velocity, color, offset, isPlayer })
    this.maxHealth = 400
    this.health = this.maxHealth
    this.attackType = null // 'punch', 'kick', 'roundhouse'
    this.hasHit = false
    this.isDodging = false
    this.attackBox = {
      position: {
        x: this.position.x,
        y: this.position.y
      },
      offset,
      width: 100,
      height: 50
    }
    this.isDead = false
    this.facingRight = isPlayer ? true : false
  }

  draw(c) {
    // Only update facing if moving
    if (this.velocity.x > 0) this.facingRight = true
    if (this.velocity.x < 0) this.facingRight = false

    const headRadius = 15;
    const centerX = this.position.x + this.width / 2;
    const topY = this.position.y;
    const headCenterY = topY + headRadius + 20; 
    const neckY = headCenterY + headRadius;
    const pelvisY = neckY + 60;
    
    c.save(); // Save context before transparency and rotation
    
    // Apply transparency if dodging
    if (this.isDodging) c.globalAlpha = 0.4;
    
    // Apply 360 horizontal rotation simulation for roundhouse kick
    if (this.attackType === 'roundhouse') {
       const elapsed = Date.now() - this.attackStartTime;
       const progress = Math.min(elapsed / 400, 1); 
       c.translate(centerX, pelvisY); 
       // Math.cos simulates a 3D spin by scaling width from 1 to -1 and back
       c.scale(Math.cos(progress * Math.PI * 2), 1);
       c.translate(-centerX, -pelvisY);
    }
    
    // Draw Goku Hair if player
    if (this.isPlayer) {
      c.fillStyle = this.color;
      c.beginPath();
      // Base of hair
      c.moveTo(centerX - headRadius + 2, headCenterY - headRadius + 2);
      
      if (this.facingRight) {
         // Spikes blowing back/up
         c.lineTo(centerX - 35, headCenterY - 20);
         c.lineTo(centerX - 10, headCenterY - 15);
         c.lineTo(centerX - 25, headCenterY - 45);
         c.lineTo(centerX, headCenterY - 25);
         c.lineTo(centerX + 15, headCenterY - 55);
         c.lineTo(centerX + 10, headCenterY - 20);
         c.lineTo(centerX + 25, headCenterY - 30);
      } else {
         // Spikes blowing right (facing left)
         c.lineTo(centerX - 25, headCenterY - 30);
         c.lineTo(centerX - 10, headCenterY - 20);
         c.lineTo(centerX - 15, headCenterY - 55);
         c.lineTo(centerX, headCenterY - 25);
         c.lineTo(centerX + 25, headCenterY - 45);
         c.lineTo(centerX + 10, headCenterY - 15);
         c.lineTo(centerX + 35, headCenterY - 20);
      }
      c.lineTo(centerX + headRadius - 2, headCenterY - headRadius + 2);
      c.fill();
    }

    c.strokeStyle = this.color;
    c.lineCap = 'round';
    c.lineWidth = 5;
    c.beginPath();
    
    // Head
    c.arc(centerX, headCenterY, headRadius, 0, Math.PI * 2);
    
    // Body
    c.moveTo(centerX, neckY);
    c.lineTo(centerX, pelvisY);
    
    // Arms
    const shoulderY = neckY + 10;
    if (this.attackType === 'punch') {
        if (this.facingRight) {
            c.moveTo(centerX, shoulderY);
            c.lineTo(centerX + 60, shoulderY); 
        } else {
            c.moveTo(centerX, shoulderY);
            c.lineTo(centerX - 60, shoulderY);
        }
    } else {
        // Idle Arms
        c.moveTo(centerX, shoulderY);
        c.lineTo(centerX - 20, shoulderY + 35);
        c.moveTo(centerX, shoulderY);
        c.lineTo(centerX + 20, shoulderY + 35);
    }
    
    // Legs
    let leftLegOffset = -20;
    let rightLegOffset = 20;
    let leftLegY = pelvisY + 50;
    let rightLegY = pelvisY + 50;
    
    if (this.attackType === 'kick' || this.attackType === 'roundhouse') {
       // Kick animation
       if (this.facingRight) {
          rightLegOffset = 70; 
          rightLegY = pelvisY - 10; // Leg high up
          leftLegOffset = -10; 
       } else {
          leftLegOffset = -70;
          leftLegY = pelvisY - 10;
          rightLegOffset = 10;
       }
    } else if (this.velocity.x !== 0) {
       const time = Date.now() / 100;
       leftLegOffset = Math.sin(time) * 30;
       rightLegOffset = Math.sin(time + Math.PI) * 30;
    }

    c.moveTo(centerX, pelvisY);
    c.lineTo(centerX + leftLegOffset, leftLegY);
    c.moveTo(centerX, pelvisY);
    c.lineTo(centerX + rightLegOffset, rightLegY);
    
    c.stroke();
    
    c.restore(); // Restore context (removes rotation and transparency)
  }

  update(c, canvasHeight, canvasWidth) {
    // Attack box positioning based on facing direction
    if (this.facingRight) {
        this.attackBox.offset.x = 0;
    } else {
        this.attackBox.offset.x = -50;
    }

    this.draw(c)

    this.attackBox.position.x = this.position.x + this.attackBox.offset.x
    this.attackBox.position.y = this.position.y + this.attackBox.offset.y

    this.position.x += this.velocity.x
    
    // Strict boundaries
    if (this.position.x < 0) {
      this.position.x = 0;
    } else if (canvasWidth && this.position.x + this.width > canvasWidth) {
      this.position.x = canvasWidth - this.width;
    }

    this.position.y += this.velocity.y

    // Gravity function
    if (this.position.y + this.height + this.velocity.y >= canvasHeight - 96) {
      this.velocity.y = 0
      this.position.y = canvasHeight - 96 - this.height
    } else {
      this.velocity.y += gravity
    }
  }

  attack(type = 'punch') {
    this.attackType = type
    this.hasHit = false
    this.attackStartTime = Date.now()
    
    let duration = 100;
    if (type === 'kick') duration = 200;
    if (type === 'roundhouse') duration = 400; // takes longer
    
    // Wider hitbox for roundhouse
    if (type === 'roundhouse') this.attackBox.width = 150;
    else this.attackBox.width = 100;

    setTimeout(() => {
      this.attackType = null
      this.attackBox.width = 100; // reset
    }, duration)
  }

  dodge() {
    if (this.isDodging) return
    this.isDodging = true
    setTimeout(() => {
      this.isDodging = false
    }, 500)
  }
}
